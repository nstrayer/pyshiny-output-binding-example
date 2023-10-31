from shiny import ui, render, App
from pathlib import Path
import pandas as pd

# Example of building a custom output binding for PyShiny.
# Here we use tabulator https://tabulator.info/ to render a table.
# The concepts are applicable across other types of outputs as well.
# Note that this is _not_ a complete implementation and you would want
# to add more features and safeguards before using this in production.

mtcars = pd.read_csv(Path(__file__).parent / "mtcars.csv")


def output_tabulator(id, height="200px"):
    """
    A shiny output that renders a tabulator table. To be paired with
    `render.data_frame` decorator.
    """
    return ui.div(id=id, class_="shiny-tabulator-output", style=f"height: {height}")


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
    @render.data_frame
    def tabulatorTable():
        return mtcars.head(input.n())


app = App(app_ui, server)
