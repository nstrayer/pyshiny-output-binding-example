# PyShiny custom output binding

Example of building a custom output binding for PyShiny.
Here we use tabulator https://tabulator.info/ to render a table.
The concepts are applicable across other types of outputs as well.
Note that this is _not_ a complete implementation and you would want
to add more features and safeguards before using this in production.

## Running

First install Shiny and pandas

```bash
# Create a virtual environment in the .venv subdirectory
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install Shiny and pandas
pip install shiny
pip install pandas
```

Then run the app (make sure your shell has activated the venv.)

```bash
shiny run --reload
```
