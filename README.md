# Online Retail Analysis
### From transaction data to interpretable sales patterns

A Python exploratory data analysis project with a companion browser dashboard. The notebook documents cleaning decisions before analysing revenue, markets, products and purchase timing.

## Workflow
1. Load the Online Retail data.
2. Inspect missing values and duplicates.
3. Remove missing customer IDs, exact duplicates, cancellations and nonpositive quantities/prices.
4. Calculate transaction-line revenue and time-based features.
5. Explore patterns with Plotly and export dashboard data.

## Run
Use Python 3.10+ and a Jupyter environment:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt jupyter
jupyter notebook analysis.ipynb
```

On Windows, activate with `.venv\Scripts\activate`.
Run the notebook from the repository root. If `data/OnlineRetail.csv` is absent, the notebook downloads the dataset from its existing Kaggle source. Internet access is required. You can instead place the CSV at that path manually.

The final cell generates `retail-data.js`. Keep it beside `Dashboard.html`, `dashboard.js` and `chart.umd.min.js`, then open `Dashboard.html`.

## Data source
[Online Retail on Kaggle](https://www.kaggle.com/datasets/vijayuv/onlineretail). Raw and generated transaction files are excluded from this repository; the notebook retains the acquisition step. Notebook outputs are cleared to keep the source readable.

## Interpretation
Revenue here is the sum of positive retained sales lines. Because cancelled/negative lines are excluded, it should not be labelled net revenue or profit. Cleaning removes records and changes the population being analysed. This is exploratory coursework, not a forecasting model.
