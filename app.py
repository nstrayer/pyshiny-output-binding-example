# Example of building a custom output binding for PyShiny.
# Here we use tabulator https://tabulator.info/ to render a table.
# The concepts are applicable across other types of outputs as well.
# Note that this is _not_ a complete implementation and you would want
# to add more features and safeguards before using this in production.


from shiny import ui, App
from pathlib import Path
import pandas as pd


from shiny.render.transformer import (
    output_transformer,
    resolve_value_fn,
    TransformerMetadata,
    ValueFn,
)
from shiny.module import resolve_id


@output_transformer()
async def render_tabulator(
    _meta: TransformerMetadata,
    _fn: ValueFn[pd.DataFrame | None],
):
    res = await resolve_value_fn(_fn)
    if res is None:
        return None

    if not isinstance(res, pd.DataFrame):
        # Throw an error if the value is not a dataframe
        raise TypeError(f"Expected a pandas.DataFrame, got {type(res)}. ")

    # Get data from dataframe as a list of lists where each inner list is a
    # row, column names as array of strings and types of each column as an
    # array of strings
    return {
        "data": res.values.tolist(),
        "columns": res.columns.tolist(),
        "type_hints": res.dtypes.astype(str).tolist(),
    }


def output_tabulator(id, height="200px"):
    """
    A shiny output that renders a tabulator table. To be paired with
    `render.data_frame` decorator.
    """
    return ui.div(
        # Use resolve_id so that our component will work in a module
        id=resolve_id(id),
        class_="shiny-tabulator-output",
        style=f"height: {height}",
    )


app_ui = ui.page_fluid(
    ui.head_content(
        ui.include_js("tableComponent.js", type="module"),
        ui.tags.link(
            href="https://unpkg.com/tabulator-tables@5.5.2/dist/css/tabulator.min.css",
            rel="stylesheet",
        ),
    ),
    ui.input_slider("n", "Number or rows", 1, 20, 5),
    output_tabulator("tabulatorTable"),
)


def server(input, output, session):
    @render_tabulator
    def tabulatorTable():
        return pd.read_csv(Path(__file__).parent / "mtcars.csv").head(input.n())


app = App(app_ui, server)
