import { Tabulator } from "https://unpkg.com/tabulator-tables@5.5.2/dist/js/tabulator_esm.min.js";

// TODOS:
// - Handle resizing of the page better
// - Give better error messages
// - Add logic for customizing display based on column types
// - Wrap up the render.data_frame() logic into a new render.tabulator()
//   function so custom logic can be provided

// Setup output binding
if (Shiny) {
  class ShinyTabulatorOutputBinding extends Shiny.OutputBinding {
    find(scope) {
      return $(scope).find(".shiny-tabulator-output");
    }

    renderValue(el, payload) {
      // Unpack the info we get from Shiny's `render.data_frame()` decorator
      const { columns, data, type_hints } = payload;

      // Convert the column names to a format that Tabulator expects
      const columnsDef = columns.map((col, i) => {
        const columnType = type_hints[i].type;
        return {
          title: col,
          field: col,
          hozAlign: columnType === "numeric" ? "right" : "left",
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
      const tabledata = data.map(zipRowWithColumns);

      // Render the table
      new Tabulator(el, {
        // height: options.height ?? "500px",
        data: tabledata,
        layout: "fitColumns",
        columns: columnsDef,
      });
    }

    renderError(el, err) {
      el.classList.add("shiny-output-error");
      el.innerText = "Error rendering table";
    }

    clearError(el) {
      el.classList.remove("shiny-output-error");
    }
  }
  Shiny.outputBindings.register(
    new ShinyTabulatorOutputBinding(),
    "shinyTabulatorOutput"
  );
}
