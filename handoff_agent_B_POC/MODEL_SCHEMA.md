# Model Schema (.mlab.json)

Current fields (subject to revision by Agent C):

```json
{
  "fcf0": number,                // starting free cash flow
  "growth": number,              // annual growth rate (e.g., 0.03)
  "wacc": number,                // discount rate (e.g., 0.1)
  "horizon": number,             // years in stage 1
  "terminalMultiple": number,    // terminal cash flow multiple
  "shares": number               // share count
}
```

Sample file:

```json
{
  "fcf0": 120,
  "growth": 0.03,
  "wacc": 0.1,
  "horizon": 5,
  "terminalMultiple": 10,
  "shares": 100
}
```
