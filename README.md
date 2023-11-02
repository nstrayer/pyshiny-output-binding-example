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

# About

In this post, you will learn how to create a custom element and accompanying output binding in PyShiny. This is useful if you want to create an output that is not currently in Shiny for your app or if you want to create a custom output for a package you are developing. Note that the code shown here is simplified to get the point across, but before you use it in your own app, you should make sure to add error handling and other features to make it robust.

## The problem

You found a new table library that you really want to use in your PyShiny app. Problem is, there's no wrapper for it, currently. The library is [Tabulator](https://tabulator.info/) and it's a javascript library.

## The solution

To implement a custom tabulator element for your app, you'll need to write three things:

1. A `output_tabulator()` function for placing the element in your app's UI
2. A javascript script that renders the element on the client side using the Tabulator library and the Shiny.js's `Shiny.OutputBinding` class.
3. A `render_tabulator()` decorator for passing table data to the javascript code rendering the element on the server side

### The `output_tabulator()` function

This is the simplest of all the steps. For the case of our table we just need an HTML element to target with our javascript code. Typically this is done with a class name. In our example we'll use the class name `shiny-tabulator-output`. We also need to allow the user to set the ID of the element so that Shiny knows which element to target with which output. By wrapping the `id` argument in `resolve_id()` we make sure it will work in the context of modules. We'll also add a height argument so that the user can set the height of the table.

```python
from shiny import ui, App
from shiny.module import resolve_id

def output_tabulator(id, height="200px"):
    return ui.div(
        # Use resolve_id so that our component will work in a module
        id=resolve_id(id),
        class_="shiny-tabulator-output",
        style=f"height: {height}",
    )
```

### The javascript code

Now that we have an element that we can target to render our tabulator table, we need to write the javascript code that will render the table. This is done with the `Shiny.OutputBinding` class. This class has two methods that we need to implement: `find()` and `renderValue()`. The `find()` method is used to find the element that we want to render the table in. The `renderValue()` method is used to render the table in the element.

```javascript
class TabulatorOutputBinding extends Shiny.OutputBinding {
    find(scope) {
        return scope.find(".shiny-tabulator-output");
    }

    renderValue(el, payload) {
        ...
    }

}
```

What we've done here is create a new class called `TabulatorOutputBinding` that inherits from the `Shiny.OutputBinding` class. We then define the `find()` and `renderValue()` methods.

Looking first at the `find` method implementation. This function is passed a `scope` object, which is a `JQuery` selection. From this we can find our tabulator elements by looking for the element class by prefixing a `"."` before the class name. (Note you could use any other valid css selector here, such as an attribute selector, or an element selector, etc.)

Next, we can look into the renderValue function. This function gets passed two arguments: `el` which is an HTMLElement as found by our find function, and `payload` which is the data that the server has provided from the render function (more on this soon.)

```javascript
    ...

    renderValue(el, payload) {
      // Unpack the info we get from Shiny's `render.data_frame()` decorator
      const { columns, data, type_hints } = payload;

      // Convert the column names to a format that Tabulator expects
      const columnsDef = columns.map((col, i) => {
        return {
          title: col,
          field: col,
          hozAlign: type_hints[i] === "numeric" ? "right" : "left",
        };
      });

      // Data comes in as a series of rows with each row having as many elements
      // as there are columns in the data. We need to map this to a series of
      // objects with keys corresponding to the column names.
      function zipRowWithColumns(row) {
        const obj = {};
        row.forEach((val, i) => {
          obj[columns[i]] = val;
        });
        return obj;
      }

      // Render the table
      new Tabulator(el, {
        data: data.map(zipRowWithColumns),
        layout: "fitColumns",
        columns: columnsDef,
      });
    }
    ...
```

The implementation of this function is not terribly important and draws directly from the [tabulator docs](https://tabulator.info/docs/5.5/quickstart). What matters is that we take our data, transform it in some way, and then instantiate our table with the `new Tabulator(el, {...})` call. In this case we take data in the form of the rows of a passed data frame, the column names, and the types of those columns, and construct a js object in the form of `data = [{col1: foo1, col2: bar1, ...}, {col1: foo2, col2: bar2, ...}]` along with combining the column names and types to create the `columnsDef` object that Tabulator expects. The format of this will vary entirely based upon the type of component you're building though, so if you don't follow, don't worry!

Last, we need to register our new class with Shiny so it adds it to the list of output bindings that it needs to check when it's looking for an output to render. We do this with the `Shiny.outputBindings.register()` function. This function takes two arguments: the name of the binding, and the class that implements the binding. We'll call our binding `"shinyjs.customOutput"` and pass it our `TabulatorOutputBinding` class.

```javascript
Shiny.outputBindings.register(
  new TabulatorOutputBinding(),
  "shiny-tabulator-output"
);
```

_Aside:_. Since this code is relying on the `Shiny` object just existing in the Javascript context. It's safe to wrap all the above code in an if statement so it only runs if that object exists. This is useful if you're writing a package that might be used in a non-Shiny context, your code wont error out and break the document.

```javascript
if (Shiny) {
    class TabulatorOutputBinding extends Shiny.OutputBinding { ... }

    Shiny.outputBindings.register(...);
}
```

### The `render_tabulator()` decorator

Now we've got the client-side logic finished, we need to write a custom render decorator that sends our data into the component.

To do this we can leverage some tools provided by shiny in the `shiny.render.transformer` subpackage.

```python
from shiny.render.transformer import (
    output_transformer,
    resolve_value_fn,
    TransformerMetadata,
    ValueFn,
)


@output_transformer
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
```

The `output_transformer` decorator is a decorator factory that takes a function that returns a dictionary of data to be passed to the client side. The function that it decorates is passed two arguments: `_meta` and `_fn`.

`_meta` is a dictionary of metadata about the function that is being decorated. We don't use it in our example.

`_fn` is the function that is being decorated. Aka the function that goes below the `@render_tabulator()` in your app's server code. In this case we are expecting that that function returns either a pandas dataframe or `None`.

In the code above we use types so that we can get some type checking in our IDE, but these are not required. Also note that the decorated function is an async function, so we need to use the `await` keyword when we call it for `resolve_value_fn()`.

`resolve_value_fn()` is a helper provided in `shiny.render.transformer` for resolving the value of a function that may or may not be async. This allows us to write our code in a way that is agnostic to how the user has written their render function.

Next we check to make sure that the value returned by the function is a dataframe. If it's not, we throw an error. This is not required, but it's good practice to do so.

Finally, we return a dictionary of data that we want to pass to the client side. In this case we return the data as a list of lists, the column names as an array of strings, and the types of each column as an array of strings using methods provided by pandas.

This returned value is then what gets sent to the client side and is available in the `payload` argument of the `renderValue()` method of our `TabulatorOutputBinding` class.

## The result

Now we have all the components neccesary to use our tabulator output component. Here's an app that uses it to render some number of rows of the indomitable `mtcars` dataset.

```python
from shiny import ui, App
from pathlib import Path
import pandas as pd


# Code for the custom output
...

# App code
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
```

The final unabbridged files are:

- [app.py](app.py)
- [tableComponent.js](tableComponent.js)
