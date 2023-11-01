import { Tabulator } from "https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator_esm.min.js";

// TODOS:
// - Handle resizing of the page better
// - Give better error messages
// - Add logic for customizing display based on column types
// - Wrap up the render.data_frame() logic into a new render.tabulator()
//   function so custom logic can be provided
makeShinyOutputBinding({
  name: "shiny-tabulator-output",
  onRender: (el, payload) => {
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
  },
});

/**
 * Create a new Shiny output binding that can be used to render content from the
 * server to the client.
 *
 * This function is a wrapper around the `Shiny.OutputBinding` class and
 * provides a simpler interface for creating output bindings. For more control
 * use the `Shiny.OutputBinding` class and the `Shiny.outputBindings.register()`
 * function directly.
 *
 * @param {string} options.name Name used to refer to this output binding in the
 *  server code. Not super important but must be unique. E.g. dont use
 *  `"dataTable"` if there is already a binding with that name.
 * @param {string} options.bindingElementClass The class-name associated with
 * the element that will be rendered by this output binding. Defaults to
 * `options.name`. This is used to find the element in the DOM when rendering
 * and is also used to identify the element as being associated with this output
 * binding. Must be unique.
 * @param {Function} options.onRender Function to run when rendering the output.
 * This function will be passed the element that was found by `find()` and the
 * payload that was sent by the server. The payload will depend on which render
 * function was used in the server code. For example, if `render.data_frame()`
 * was used, then the payload will be an object with the following properties:
 * - `columns`: An array of strings containing the column names
 * - `data`: An array of arrays containing the data
 * - `type_hints`: An array of objects containing the column types. Each object
 *   has a `type` property that is either `"numeric"` or `"character"`. Note
 *   that the element passed may already be populated with content from a
 *   previous render and it is up to the function to clear the element and
 *   re-render the content.
 * @param {Function} options.onError Function to run when an error occurs. This
 * function will be passed the element that was found by `find()` and the error
 * that was thrown. By default this function will add the class
 * `"shiny-output-error"` to the element and set the text to `"Error rendering
 * ${bindingName}"`.
 * @param {Function} options.onClearError Function to run when clearing an
 * error. This function will be passed the element that was found by `find()`.
 * By default this function will remove the class `"shiny-output-error"` from
 * the element and set the text to `""`.
 */
function makeShinyOutputBinding({
  name,
  bindingElementClass = name,
  onRender,
  onError = (el, err) => {
    el.classList.add("shiny-output-error");
    el.innerText = `Error rendering ${name}`;
  },
  onClearError = (el) => {
    el.classList.remove("shiny-output-error");
    el.innerText = "";
  },
}) {
  // Make sure Shiny is available on the window before trying to use it
  if (Shiny) {
    class CustomOutputBinding extends Shiny.OutputBinding {
      find(scope) {
        return $(scope).find(`.${bindingElementClass}`);
      }

      renderValue(el, payload) {
        onRender(el, payload);
      }

      renderError(el, err) {
        onError(el, err);
      }

      clearError(el) {
        onClearError(el);
      }
    }
    Shiny.outputBindings.register(new CustomOutputBinding(), name);
  } else {
    throw new Error(`Failed to bind ${name} to Shiny runtime.`);
  }
}
