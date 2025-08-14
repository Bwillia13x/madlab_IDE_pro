# Quantitative Methods (MAD LAB)

This document summarizes the quantitative engines used in MAD LAB and key assumptions.

## DCF (Discounted Cash Flow)
- Schedule: FCF grows at rate \(g\); discounted at WACC \(r\); PV aggregated over horizon \(N\).
- Terminal Value:
  - Gordon Growth (GGM): \( TV_N = \frac{FCF_{N+1}}{r - g} \) with \( FCF_{N+1} = FCF_N (1+g) \).
  - Exit Multiple: \( TV_N = FCF_N \times \text{Multiple} \).
- Enterprise Value: \( EV = \sum_{t=1}^N PV(FCF_t) + PV(TV_N) \).
- Sensitivities: `dcfSensitivityGrid` computes EV across grids of \(g\) and \(r\).

## Risk Metrics (VaR/ES)
- Returns: log or simple; defaults to log.
- Historical VaR: lower-tail quantile at \(\alpha = 1 - \text{confidence}\); VaR is positive loss \( -Q_\alpha \).
- Expected Shortfall: mean loss conditional on being in the lower tail.
- Cornish–Fisher VaR: skew/kurtosis adjusted z-score for non-normal returns.
- Bootstrap CIs: `bootstrapVaREs` resamples returns to produce empirical confidence intervals for VaR/ES/CF VaR.
 - Portfolio: compute weighted returns from per-asset return series, then apply the same VaR/ES estimators.

## Black–Scholes
- Pricing: standard European BS with lognormal dynamics; call/put via \(d_1, d_2\) and \(N(\cdot)\).
- Greeks: \(\Delta, \Gamma, \Vega, \Theta, \Rho\) computed in annualized units.
- Normalizations:
  - `vegaPerPct = vega/100` (per 1% vol change)
  - `thetaPerDay = theta/252` (per trading day)
  - `rhoPerPctRate = rho/100` (per 1% rate change)

## Volatility (Realized Vol, Vol Cone)
- Realized vol annualizes rolling stdev of log returns by \(\sqrt{252}\).
- Vol Cone: `buildVolCone` samples realized vol at multiple windows (e.g., 20/60/120/252).

## Notes
- Units: Unless specified, greeks are per 1.0 changes (e.g., vega per 1.0 volatility). Use the normalizations above to report per-1% and per-day quantities consistently.
- Numerics: Risk bootstrap uses simple IID resampling; for serial correlation, consider block bootstraps.


