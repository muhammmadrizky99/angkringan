"""
Flask Prediction Service for Angkringan Demand Prediction
Receives historical sales data with weather/event info and returns XGBoost predictions

Mekanisme Auto-Retraining:
Setiap kali prediksi dijalankan melalui antarmuka sistem, microservice ini
secara otomatis melatih ulang model XGBoost menggunakan seluruh data transaksi
terbaru dari database. Model yang sudah dilatih disimpan ke file .pkl untuk
digunakan pada prediksi berikutnya.

Evaluasi: Time Series Split (80% train, 20% test)
Produksi: Retrain menggunakan 100% data
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib
import os
import json
import traceback
from datetime import datetime

app = Flask(__name__)
CORS(app)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

# Ramadan 1446H: 28 Feb 2025 - 29 Mar 2025
RAMADAN_1446_START = pd.Timestamp("2025-02-28")
RAMADAN_1446_END = pd.Timestamp("2025-03-29")

# Ramadan 1447H: 19 Feb 2026 - 19 Mar 2026
RAMADAN_1447_START = pd.Timestamp("2026-02-19")
RAMADAN_1447_END = pd.Timestamp("2026-03-19")

# Hyperparameter XGBoost
XGB_PARAMS = {
    "n_estimators": 200,
    "max_depth": 5,
    "learning_rate": 0.05,
    "subsample": 0.85,
    "colsample_bytree": 0.85,
    "min_child_weight": 2,
    "gamma": 0.05,
    "reg_alpha": 0.05,
    "reg_lambda": 0.8,
    "random_state": 42,
    "objective": "reg:squarederror",
}

FEATURE_COLS = [
    "day_of_week", "is_weekend", "month", "day_of_month", "is_ramadan",
    "lag_1", "lag_3", "lag_7",
    "rolling_mean_7", "rolling_mean_14", "rolling_std_7",
    "weather", "event"
]


def calculate_mape(y_true, y_pred):
    y_true, y_pred = np.array(y_true, dtype=float), np.array(y_pred, dtype=float)
    mask = y_true > 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def create_features(df):
    """Create features for prediction including weather, event, month, and ramadan.
    Catatan: Angkringan Agoy buka dari sore (~16.00), tetap BUKA saat Ramadan.
    Fitur is_ramadan menangkap pola POSITIF (ramai bukber), bukan negatif."""
    df = df.sort_values("date").copy()

    # Outlier handling: Percentile Capping
    Q1 = df["quantity"].quantile(0.01)
    Q99 = df["quantity"].quantile(0.99)
    df["quantity"] = df["quantity"].clip(lower=Q1, upper=Q99)

    df["day_of_week"] = df["date"].dt.dayofweek
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    df["month"] = df["date"].dt.month
    df["day_of_month"] = df["date"].dt.day
    df["is_ramadan"] = (
        ((df["date"] >= RAMADAN_1446_START) & (df["date"] <= RAMADAN_1446_END)) |
        ((df["date"] >= RAMADAN_1447_START) & (df["date"] <= RAMADAN_1447_END))
    ).astype(int)

    # Lag features
    df["lag_1"] = df["quantity"].shift(1)
    df["lag_3"] = df["quantity"].shift(3)
    df["lag_7"] = df["quantity"].shift(7)

    # Rolling statistics
    df["rolling_mean_7"] = df["quantity"].rolling(window=7).mean()
    df["rolling_mean_14"] = df["quantity"].rolling(window=14).mean()
    df["rolling_std_7"] = df["quantity"].rolling(window=7).std()

    # Ensure weather and event columns exist
    if "weather" not in df.columns:
        df["weather"] = 0
    if "event" not in df.columns:
        df["event"] = 0

    # Fill NaN weather/event with 0 (cerah, no event)
    df["weather"] = df["weather"].fillna(0).astype(int)
    df["event"] = df["event"].fillna(0).astype(int)

    df = df.dropna(subset=["lag_1", "lag_3", "lag_7", "rolling_mean_7", "rolling_mean_14", "rolling_std_7"])
    return df


def build_tomorrow_features(df_features, tomorrow_dt, tomorrow_weather, tomorrow_event):
    """Build feature vector for tomorrow's prediction"""
    is_ramadan_tomorrow = 1 if (
        (RAMADAN_1446_START <= tomorrow_dt <= RAMADAN_1446_END) or
        (RAMADAN_1447_START <= tomorrow_dt <= RAMADAN_1447_END)
    ) else 0

    tomorrow_features = {
        "day_of_week": tomorrow_dt.dayofweek,
        "is_weekend": 1 if tomorrow_dt.dayofweek >= 5 else 0,
        "month": tomorrow_dt.month,
        "day_of_month": tomorrow_dt.day,
        "is_ramadan": is_ramadan_tomorrow,
        "lag_1": float(df_features["quantity"].iloc[-1]),
        "lag_3": float(df_features["quantity"].iloc[-3]) if len(df_features) >= 3 else float(df_features["quantity"].mean()),
        "lag_7": float(df_features["quantity"].iloc[-7]) if len(df_features) >= 7 else float(df_features["quantity"].mean()),
        "rolling_mean_7": float(df_features["quantity"].iloc[-7:].mean()),
        "rolling_mean_14": float(df_features["quantity"].iloc[-14:].mean()) if len(df_features) >= 14 else float(df_features["quantity"].mean()),
        "rolling_std_7": float(df_features["quantity"].iloc[-7:].std()) if len(df_features) >= 7 else 0.0,
        "weather": int(tomorrow_weather),
        "event": int(tomorrow_event),
    }
    return pd.DataFrame([tomorrow_features])[FEATURE_COLS]


def auto_retrain(product_name, df_features):
    """
    Auto-Retraining: Melatih ulang model XGBoost setiap kali prediksi dijalankan.
    
    Strategi:
    1. EVALUASI: Time Series Split (80% awal untuk train, 20% akhir untuk test)
       → menghasilkan metrik MAE, RMSE, MAPE yang jujur
    2. PRODUKSI: Latih ulang menggunakan 100% data
       → model yang disimpan ke .pkl adalah model yang paling update
    """
    X = df_features[FEATURE_COLS]
    y = df_features["quantity"]

    # 1. EVALUASI — Time Series Split
    train_size = int(len(df_features) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

    eval_model = XGBRegressor(**XGB_PARAMS)
    eval_model.fit(X_train, y_train, verbose=False)

    mae, rmse, mape = None, None, None
    if len(X_test) > 0:
        y_pred = eval_model.predict(X_test)
        y_pred = np.maximum(y_pred, 0)
        mae = float(mean_absolute_error(y_test, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
        mape = calculate_mape(y_test.values, y_pred)

    # 2. PRODUKSI — Retrain dengan 100% data
    final_model = XGBRegressor(**XGB_PARAMS)
    final_model.fit(X, y, verbose=False)

    # Simpan model terbaru ke file .pkl
    safe_name = product_name.replace(" ", "_").lower()
    model_path = os.path.join(MODELS_DIR, f"model_{safe_name}.pkl")
    os.makedirs(MODELS_DIR, exist_ok=True)
    joblib.dump(final_model, model_path)

    print(f"  [AUTO-RETRAIN] {product_name}: {len(df_features)} data | MAPE: {mape:.1f}% | Model saved")

    return final_model, mae, rmse, mape


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ML Prediction Service"})


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json

        if not data or "sales_data" not in data:
            return jsonify({"error": "sales_data is required"}), 400

        product_name = data.get("product_name", "unknown")
        sales_data = data["sales_data"]
        tomorrow_weather = data.get("tomorrow_weather", 0)
        tomorrow_event = data.get("tomorrow_event", 0)

        if len(sales_data) < 14:
            # Not enough data — use simple average
            quantities = [s["quantity"] for s in sales_data]
            avg_qty = sum(quantities) / len(quantities) if quantities else 0
            return jsonify({
                "product_name": product_name,
                "predicted_quantity": round(avg_qty),
                "mae": None, "rmse": None, "mape": None,
                "method": "simple_average",
                "message": "Not enough data for XGBoost (min 14 days required)"
            })

        # Prepare DataFrame
        df = pd.DataFrame(sales_data)
        df["date"] = pd.to_datetime(df["date"])
        if "weather" not in df.columns:
            df["weather"] = 0
        if "event" not in df.columns:
            df["event"] = 0
        df = df.sort_values("date")

        # Create features
        df_features = create_features(df)

        if len(df_features) < 10:
            avg = df["quantity"].mean()
            return jsonify({
                "product_name": product_name,
                "predicted_quantity": round(avg),
                "mae": None, "rmse": None, "mape": None,
                "method": "average",
            })

        # Auto-retrain model
        model, mae, rmse, mape = auto_retrain(product_name, df_features)

        # Predict tomorrow
        last_date = df_features["date"].iloc[-1]
        tomorrow_dt = pd.Timestamp(last_date) + pd.Timedelta(days=1)
        X_tomorrow = build_tomorrow_features(df_features, tomorrow_dt, tomorrow_weather, tomorrow_event)
        predicted_qty = max(0, round(float(model.predict(X_tomorrow)[0])))

        # Feature importance
        importance = dict(zip(FEATURE_COLS, [float(x) for x in model.feature_importances_]))

        return jsonify({
            "product_name": product_name,
            "predicted_quantity": predicted_qty,
            "mae": round(mae, 2) if mae else None,
            "rmse": round(rmse, 2) if rmse else None,
            "mape": round(mape, 2) if mape else None,
            "method": "xgboost",
            "prediction_date": str(tomorrow_dt.date()),
            "weather_used": int(tomorrow_weather),
            "event_used": int(tomorrow_event),
            "feature_importance": importance,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    """Batch prediction for multiple products with auto-retraining"""
    try:
        data = request.json
        if not data or "products" not in data:
            return jsonify({"error": "products array is required"}), 400

        tomorrow_weather = data.get("tomorrow_weather", 0)
        tomorrow_event = data.get("tomorrow_event", 0)

        print(f"\n{'='*60}")
        print(f"[AUTO-RETRAIN] Batch prediction started at {datetime.now().strftime('%H:%M:%S')}")
        print(f"  Weather: {tomorrow_weather} | Event: {tomorrow_event}")
        print(f"  Products: {len(data['products'])}")
        print(f"{'='*60}")

        results = []
        for product_data in data["products"]:
            product_name = product_data.get("product_name", "unknown")
            sales_data = product_data.get("sales_data", [])

            if len(sales_data) < 7:
                results.append({
                    "product_name": product_name,
                    "predicted_quantity": 0,
                    "mae": None, "rmse": None, "mape": None,
                    "method": "insufficient_data",
                })
                continue

            df = pd.DataFrame(sales_data)
            df["date"] = pd.to_datetime(df["date"])
            if "weather" not in df.columns:
                df["weather"] = 0
            if "event" not in df.columns:
                df["event"] = 0
            df = df.sort_values("date")

            df_features = create_features(df)

            if len(df_features) < 10:
                avg = df["quantity"].mean()
                results.append({
                    "product_name": product_name,
                    "predicted_quantity": round(avg),
                    "mae": None, "rmse": None, "mape": None,
                    "method": "average",
                })
                continue

            # Auto-retrain model
            model, mae, rmse, mape = auto_retrain(product_name, df_features)

            # Predict tomorrow
            last_date = df_features["date"].iloc[-1]
            tomorrow_dt = pd.Timestamp(last_date) + pd.Timedelta(days=1)
            X_tomorrow = build_tomorrow_features(df_features, tomorrow_dt, tomorrow_weather, tomorrow_event)
            pred_qty = max(0, round(float(model.predict(X_tomorrow)[0])))

            results.append({
                "product_name": product_name,
                "predicted_quantity": pred_qty,
                "mae": round(mae, 2) if mae is not None else None,
                "rmse": round(rmse, 2) if rmse is not None else None,
                "mape": round(mape, 2) if mape is not None else None,
                "method": "xgboost",
                "prediction_date": str(tomorrow_dt.date()),
                "weather_used": int(tomorrow_weather),
                "event_used": int(tomorrow_event),
            })

        print(f"[AUTO-RETRAIN] Batch completed: {len(results)} products processed\n")

        return jsonify({"predictions": results})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    print("Starting ML Prediction Service on port 5001...")
    print(f"Models directory: {MODELS_DIR}")
    print("Auto-retrain: ENABLED (Time Series Split + Full Data Retrain)")
    if os.path.exists(MODELS_DIR):
        models = [f for f in os.listdir(MODELS_DIR) if f.endswith(".pkl")]
        print(f"Found {len(models)} trained models")
    else:
        print("No models directory found. Models will be created on first prediction.")
    app.run(host="0.0.0.0", port=5001, debug=True)
