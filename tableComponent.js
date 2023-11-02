import { Tabulator } from "https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator_esm.min.js";

// Possible improvements:
// - Handle resizing of the page better
// - Give better error messages
// - Add logic for customizing display based on column types

// Wrap all definition in a check for the presence of Shiny. This allows the JS
// to be loaded outside without causing errors.
if (Shiny) {
  class TabulatorOutputBinding extends Shiny.OutputBinding {
    /**
     * Find the element that will be rendered by this output binding.
     * @param {HTMLElement} scope The scope in which to search for the element.
     * @returns {HTMLElement} The element that will be rendered by this output
     * binding.
     */
    find(scope) {
      return scope.find(".shiny-tabulator-output");
    }

    /**
     * Function to run when rendering the output. This function will be passed
     * the element that was found by `find()` and the payload that was sent by
     * the server when there's new data to render. Note that the element passed
     * may already be populated with content from a previous render and it is up
     * to the function to clear the element and re-render the content.
     * @param {HTMLElement} el The element that was found by `find()`
     * @param {Record<String, Any>} payload An object with the following properties as provided by
     * `@render_tabulator:
     * - `columns`: An array of strings containing the column names
     * - `data`: An array of arrays containing the data
     * - `type_hints`: An array of objects containing the column types. Each
     *   object
     */
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
  }
  Shiny.outputBindings.register(
    new TabulatorOutputBinding(),
    "shiny-tabulator-output"
  );
}
