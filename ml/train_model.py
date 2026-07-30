"""
XGBoost Model Training for Angkringan Agoy Demand Prediction
Trains models using merged CSV data from database (sales + weather)

Features: day_of_week, is_weekend, month, day_of_month, is_ramadan, lag_1, lag_3, lag_7,
          rolling_mean_7, rolling_mean_14, rolling_std_7, weather, event
Split: 80% train, 20% test (time-series split) for evaluation
Final: Retrained on 100% data for production
Metrics: MAE, RMSE, MAPE
"""

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor
import joblib
import os
import json

# Ramadan 1446H: 28 Feb 2025 - 29 Mar 2025
RAMADAN_1446_START = pd.Timestamp("2025-02-28")
RAMADAN_1446_END = pd.Timestamp("2025-03-29")

# Ramadan 1447H: 19 Feb 2026 - 19 Mar 2026
RAMADAN_1447_START = pd.Timestamp("2026-02-19")
RAMADAN_1447_END = pd.Timestamp("2026-03-19")


def calculate_mape(y_true, y_pred):
    """Calculate Mean Absolute Percentage Error, ignoring zero actuals"""
    y_true, y_pred = np.array(y_true, dtype=float), np.array(y_pred, dtype=float)
    mask = y_true > 0
    if mask.sum() == 0:
        return 0.0
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


# Hyperparameter XGBoost (identik dengan predict_service.py)
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


def create_features(df):
    """Create time series features for a single product.
    Logika identik dengan predict_service.py untuk konsistensi hasil."""
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

    # Lag features (tanpa backfill, konsisten dengan predict_service.py)
    df["lag_1"] = df["quantity"].shift(1)
    df["lag_3"] = df["quantity"].shift(3)
    df["lag_7"] = df["quantity"].shift(7)

    # Rolling statistics (tanpa min_periods, konsisten dengan predict_service.py)
    df["rolling_mean_7"] = df["quantity"].rolling(window=7).mean()
    df["rolling_mean_14"] = df["quantity"].rolling(window=14).mean()
    df["rolling_std_7"] = df["quantity"].rolling(window=7).std()

    # Ensure weather and event columns exist
    if "weather" not in df.columns:
        df["weather"] = 0
    if "event" not in df.columns:
        df["event"] = 0

    df["weather"] = df["weather"].fillna(0).astype(int)
    df["event"] = df["event"].fillna(0).astype(int)

    # Drop baris dengan NaN pada fitur lag/rolling (konsisten dengan predict_service.py)
    df = df.dropna(subset=["lag_1", "lag_3", "lag_7", "rolling_mean_7", "rolling_mean_14", "rolling_std_7"])
    return df


FEATURE_COLS = [
    "day_of_week", "is_weekend", "month", "day_of_month", "is_ramadan",
    "lag_1", "lag_3", "lag_7",
    "rolling_mean_7", "rolling_mean_14", "rolling_std_7",
    "weather", "event"
]


def train_model_for_product(product_df, product_name):
    """Train XGBoost model for a single product"""
    df = create_features(product_df)

    if len(df) < 20:
        return None

    X = df[FEATURE_COLS]
    y = df["quantity"]

    # 1. EVALUASI (Time-series split untuk menghitung akurasi akademik)
    train_size = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:train_size], X.iloc[train_size:]
    y_train, y_test = y.iloc[:train_size], y.iloc[train_size:]

    eval_model = XGBRegressor(**XGB_PARAMS)
    eval_model.fit(X_train, y_train)
    y_pred = eval_model.predict(X_test)
    y_pred = np.maximum(y_pred, 0)
    
    mae = float(mean_absolute_error(y_test, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mape = calculate_mape(y_test, y_pred)

    # 2. PRODUKSI (Latih ulang menggunakan 100% data agar model paling update)
    final_model = XGBRegressor(**XGB_PARAMS)
    final_model.fit(X, y)

    importance = dict(zip(FEATURE_COLS, [float(x) for x in final_model.feature_importances_]))
    
    return {
        "model": final_model,
        "mae": mae,
        "rmse": rmse,
        "mape": mape,
        "feature_importance": importance
    }


def main():
    print("=" * 60)
    print("XGBoost Training - Angkringan Agoy Demand Prediction")
    print("=" * 60)

    # Path data
    base_dir = os.path.dirname(__file__)
    csv_path = os.path.join(base_dir, "..", "backend", "data", "merged_training_data.csv")
    
    if not os.path.exists(csv_path):
        print(f"No data file found at {csv_path}")
        return

    print(f"Loading data from: {csv_path}")
    df = pd.read_csv(csv_path)
    df['date'] = pd.to_datetime(df['date'])

    products = df['product_name'].unique()
    print(f"Found {len(products)} products")

    # Create models directory
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)

    results = {}
    for product_name in products:
        product_df = df[df['product_name'] == product_name].copy()
        result = train_model_for_product(product_df, product_name)

        if result:
            safe_name = product_name.replace(" ", "_").lower()
            model_path = os.path.join(models_dir, f"model_{safe_name}.pkl")
            joblib.dump(result["model"], model_path)

            results[product_name] = result

    # Save metadata
    metadata_path = os.path.join(models_dir, "metadata.json")
    serializable_results = {}
    for k, v in results.items():
        serializable_results[k] = {
            "model_file": f"model_{k.replace(' ', '_').lower()}.pkl",
            "mae": round(v["mae"], 2),
            "rmse": round(v["rmse"], 2),
            "mape": round(v["mape"], 2),
            "feature_importance": v["feature_importance"],
        }

    with open(metadata_path, "w") as f:
        json.dump(serializable_results, f, indent=2)

    print("\n" + "=" * 60)
    print("Training completed!")
    print(f"Models saved to: {models_dir}")
    print("=" * 60)

    # Summary table
    print(f"\nModel Performance Summary (Validated with Time-Series Split):")
    print(f"{'Product':<30} {'MAE':>8} {'RMSE':>8} {'MAPE':>8}   {'Top Feature'}")
    print("-" * 80)
    
    total_mape = 0
    for name, r in results.items():
        top_feat = max(r['feature_importance'], key=r['feature_importance'].get)
        print(f"{name:<30} {r['mae']:>8.2f} {r['rmse']:>8.2f} {r['mape']:>7.2f}%   {top_feat}")
        total_mape += r['mape']
    
    avg_mape = total_mape / len(results) if results else 0
    print("-" * 80)
    print(f"{'AVERAGE VALIDATION MAPE':<30} {'-':>8} {'-':>8} {avg_mape:>7.2f}%")
    print("Info: Models saved to .pkl were retrained on 100% of available data.")


if __name__ == "__main__":
    main()
