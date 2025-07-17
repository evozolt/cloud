let resultSortDirection = 'asc';
    let etaSortDirection = 'asc';
    let countrySortState = 0;

    async function checkDeliveries() {
      const input = document.getElementById('deliveryInput').value.trim();
      const deliveryLines = [...new Set(input.split('\n').map(line => line.trim()).filter(Boolean))];
      const resultBox = document.getElementById('resultBox');
      resultBox.innerHTML = '<div class="text-center p-3">â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–’â–’ 80% Checking database...</div>';

      try {
        const [jubailResponse, yanbuResponse, chemicalResponse] = await Promise.all([
          fetch('https://fares.iceiy.com/portal/trips-jubail.json'),
          fetch('https://fares.iceiy.com/portal/trips-yanbu.json'),
          fetch('https://fares.iceiy.com/portal/trips-chemical.json')
        ]);

        if (!jubailResponse.ok || !yanbuResponse.ok || !chemicalResponse.ok) {
          throw new Error('One or more network responses were not ok');
        }

        const [jubailData, yanbuData, chemicalData] = await Promise.all([
          jubailResponse.json(),
          yanbuResponse.json(),
          chemicalResponse.json()
        ]);

        console.log("Jubail Data:", jubailData);
        console.log("Yanbu Data:", yanbuData);
        console.log("Chemical Data:", chemicalData);

        if (!Array.isArray(jubailData) || !Array.isArray(yanbuData) || !Array.isArray(chemicalData)) {
          throw new Error('Invalid data format: Expected arrays');
        }

        const allJubail = jubailData.flat();
        const allYanbu = yanbuData.flat();
        const allChemical = chemicalData.flat();
        const processedDeliveries = new Set();

        let tableHTML = `
          <table id="resultTable" class="table table-hover table-bordered mb-0">
            <thead class="table-light">
              <tr>
                <th>Delivery</th>
                <th class="sortable eta-header">ETA <i class="fa fa-sort"></i></th>
                <th>Order</th>
                <th>Truck</th>
                <th>Customer Name</th>
                <th class="sortable country-header">Country <i class="fa fa-filter"></i></th>
                <th>Plant</th>
                <th>Destination</th>
                <th class="sortable result-header">Result <i class="fa fa-sort"></i>â€‚â€”â€‚<i class="fa fa-copy copy-icon" onclick="event.stopPropagation(); copyResultColumn()"></i>
</th>
                <th>
                  <span class="yard-toggle">
                    Yard <i class="fa fa-plus"></i>
                  </span>
                </th>
                <th>Load Date</th>
              </tr>
              <tr id="filterRow" style="display: none;">
                <th><input type="text" id="filterDelivery" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterETA" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterOrder" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterTruck" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterCustomer" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterCountry" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterPlant" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterDestination" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterResult" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterYard" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
                <th><input type="text" id="filterLoad" class="form-control filter-input" placeholder="Filter" onkeyup="debouncedFilterTable(event)"></th>
              </tr>
            </thead>
            <tbody>
        `;

        if (deliveryLines.length === 0) {
          tableHTML += `
            <tr>
              <td colspan="10" class="text-center"><span class="not-found">Please enter at least one order number</span></td>
            </tr>
          `;
        } else {
          deliveryLines.forEach(line => {
            const delivery = line.trim().toLowerCase();
            console.log("Searching for delivery:", delivery);

            const findDelivery = (data, delivery, yardName) => {
              return data.find(entry => {
                const entryDelivery = entry.Delivery?.toString().toLowerCase();
                if (!processedDeliveries.has(entryDelivery)) {
                  return entryDelivery === delivery || 
                         entryDelivery.split('+').map(d => d.trim().toLowerCase()).includes(delivery);
                }
                return false;
              });
            };

            let found = null;
            let yard = "-";

            found = findDelivery(allJubail, delivery, "Jubail");
            if (found) yard = "Jubail";

            if (!found) {
              found = findDelivery(allYanbu, delivery, "Yanbu");
              if (found) yard = "Yanbu";
            }

            if (!found) {
              found = findDelivery(allChemical, delivery, "Chemical");
              if (found) yard = "Chemical";
            }

            if (found) {
              const entryDelivery = found.Delivery?.toString().toLowerCase();
              processedDeliveries.add(entryDelivery);

              let result = "";
if (found.Status === "In Factory") {
  result = `<span class="ready">Material is ready</span>`;
} else if (found.Status?.toLowerCase().includes("cancelled")) {
  result = `<span class="cancelled">${found.Status}</span>`;
} else {
  result = `<span class="not-ready">${found.Status || 'Unknown'}</span>`;
}

              tableHTML += `
                <tr>
                  <td>${found.Delivery || '-'}</td>
                  <td>${found.ETA || '-'}</td>
                  <td>${found.Order || '-'}</td>
                  <td>${found.Truck || '-'}</td>
                  <td>${found["Customer Name"] || '-'}</td>
                  <td>${found.Country || '-'}</td>
                  <td>${found.Plant || '-'}</td>
                  <td>${found.Destination || '-'}</td>
                  <td>${result}</td>
                  <td>${yard}</td>
                  <td>${found["Loading Date"] || '-'}</td>
                </tr>
              `;
            } else {
              if (!processedDeliveries.has(delivery) && 
                  !Array.from(processedDeliveries).some(pd => pd.split('+').map(d => d.trim().toLowerCase()).includes(delivery))) {
                tableHTML += `  
                  <tr>
                    <td>${delivery}</td>
                    <td colspan="7">-</td>
                    <td><span class="not-found">Not found</span></td>
                    <td>-</td>
                  </tr>
                `;
                processedDeliveries.add(delivery);
              }
            }
          });
        }

        tableHTML += `</tbody></table>`;
        resultBox.innerHTML = tableHTML;

        const yardToggle = document.querySelector('.yard-toggle');
        const countryHeader = document.querySelector('.country-header');
        const etaHeader = document.querySelector('.eta-header');
        const resultHeader = document.querySelector('.result-header');
        if (yardToggle) {
          yardToggle.removeEventListener('click', toggleFilterRow);
          yardToggle.addEventListener('click', toggleFilterRow);
          console.log("Toggle event listener bound to yard-toggle");
        } else {
          console.error("Yard toggle element not found");
        }
        if (countryHeader) {
          countryHeader.removeEventListener('click', toggleCountryFilter);
          countryHeader.addEventListener('click', toggleCountryFilter);
          console.log("Toggle event listener bound to country-header");
        } else {
          console.error("Country header element not found");
        }
        if (etaHeader) {
          etaHeader.removeEventListener('click', sortTableByETA);
          etaHeader.addEventListener('click', sortTableByETA);
          console.log("Toggle event listener bound to eta-header");
        } else {
          console.error("ETA header element not found");
        }
        if (resultHeader) {
          resultHeader.removeEventListener('click', sortTableByResult);
          resultHeader.addEventListener('click', sortTableByResult);
          console.log("Toggle event listener bound to result-header");
        } else {
          console.error("Result header element not found");
        }
      } catch (err) {
        console.error("Error in checkDeliveries:", err);
        resultBox.innerHTML = `<p class="text-danger text-center p-3">âŒ Error fetching data. Please check your connection or contact support.</p>`;
      }
    }

    function copyResultColumn() {
      const table = document.getElementById("resultTable");
      if (!table) {
        alert("No data available to copy.");
        return;
      }

      const rows = Array.from(table.querySelectorAll("tbody tr")).filter(row => row.style.display !== "none");
      const resultData = rows.map(row => {
        const cell = row.cells[8];
        if (!cell) return "Not found"; // Guard against undefined cells
        // Directly use textContent to avoid HTML parsing issues
        return cell.textContent.trim() || "Not found";
      }).filter(text => text !== "").join("\n");

      if (resultData) {
        navigator.clipboard.writeText(resultData).then(() => {
          alert("Result data copied to clipboard!");
        }).catch(err => {
          console.error("Failed to copy: ", err);
          alert("Failed to copy data. Please try again.");
        });
      } else {
        alert("No data available to copy.");
      }
    }

    function debounce(func, wait) {
      let timeout;
      return function executedFunction(event) {
        if (event && typeof event.stopPropagation === 'function') {
          event.stopPropagation();
        }
        const later = () => {
          clearTimeout(timeout);
          func(event);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    document.getElementById('deliveryInput').addEventListener('input', function() {
      let val = this.value;
      val = val
        .split('\n')
        .map(line => line.trim().replace(/\s+/g, ' '))
        .filter(line => line.length > 0)
        .join('\n');
      if (this.value !== val) {
        this.value = val;
      }

      const clearIcon = document.getElementById('clearInput');
      clearIcon.style.display = this.value.trim() ? 'block' : 'none';
    });

    document.getElementById('clearInput').addEventListener('click', function() {
      const textarea = document.getElementById('deliveryInput');
      textarea.value = '';
      this.style.display = 'none';
      textarea.focus();
    });

    const debouncedFilterTable = debounce(function(event) {
      console.log("filterTable called from input:", event?.target?.id || 'programmatic');
      const filterRow = document.getElementById("filterRow");
      const currentDisplay = filterRow.style.display;
      console.log("Filter row display before filtering:", currentDisplay);

      const table = document.getElementById("resultTable");
      const rows = table.getElementsByTagName("tr");
      const filters = {
        delivery: document.getElementById("filterDelivery").value.toLowerCase(),
        eta: document.getElementById("filterETA").value.toLowerCase(),
        order: document.getElementById("filterOrder").value.toLowerCase(),
        truck: document.getElementById("filterTruck").value.toLowerCase(),
        customer: document.getElementById("filterCustomer").value.toLowerCase(),
        country: document.getElementById("filterCountry").value.toLowerCase(),
        plant: document.getElementById("filterPlant").value.toLowerCase(),
        destination: document.getElementById("filterDestination").value.toLowerCase(),
        result: document.getElementById("filterResult").value.toLowerCase(),
        yard: document.getElementById("filterYard").value.toLowerCase(),
        load: document.getElementById("filterLoad").value.toLowerCase(),
      };

      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].getElementsByTagName("td");
        let shouldDisplay = true;

        for (let j = 0; j < cells.length; j++) {
          const cellText = (cells[j].textContent || cells[j].innerText).toLowerCase();
          if (filters[Object.keys(filters)[j]] && !cellText.includes(filters[Object.keys(filters)[j]])) {
            shouldDisplay = false;
            break;
          }
        }

        if (shouldDisplay && cells[5]) {
          const country = cells[5].textContent.trim().toLowerCase();
          if (countrySortState === 1 && country !== "ksa") {
            shouldDisplay = false;
          } else if (countrySortState === 2 && country === "ksa") {
            shouldDisplay = false;
          }
        }

        rows[i].style.display = shouldDisplay ? "" : "none";
      }

      filterRow.style.display = currentDisplay || "table-row";
      console.log("Filter row display after filtering:", filterRow.style.display);
    }, 300);

    function toggleFilterRow(event) {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const filterRow = document.getElementById("filterRow");
      const toggleIcon = document.querySelector(".yard-toggle i");

      if (!filterRow || !toggleIcon) {
        console.error("Filter row or toggle icon not found");
        return;
      }

      console.log("Toggling filter row, current display:", filterRow.style.display);

      const isHidden = filterRow.style.display === "none" || filterRow.style.display === "";
      filterRow.style.display = isHidden ? "table-row" : "none";
      toggleIcon.classList.toggle("fa-plus", !isHidden);
      toggleIcon.classList.toggle("fa-minus", isHidden);

      if (!isHidden) {
        const filterInputs = document.querySelectorAll(".filter-input");
        filterInputs.forEach(input => input.value = "");
        debouncedFilterTable({ target: { id: "toggleFilterRow" } });
        console.log("Filter row hidden, inputs cleared");
      } else {
        console.log("Filter row shown");
      }
    }

    function parseDDMMYYYY(dateStr) {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      return new Date(year, month - 1, day);
    }

    function sortTableByETA(event) {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const filterRow = document.getElementById("filterRow");
      const currentDisplay = filterRow.style.display;
      console.log("sortTableByETA, filter row display before:", currentDisplay);

      const table = document.getElementById("resultTable");
      const tbody = table.tBodies[0];
      const rowsArray = Array.from(tbody.rows).filter(row => row.style.display !== 'none');

      rowsArray.sort((a, b) => {
        const aText = a.cells[1].textContent.trim();
        const bText = b.cells[1].textContent.trim();

        const aDate = parseDDMMYYYY(aText);
        const bDate = parseDDMMYYYY(bText);

        if (!aDate || isNaN(aDate)) return 1;
        if (!bDate || isNaN(bDate)) return -1;

        return etaSortDirection === 'asc' ? aDate - bDate : bDate - aDate;
      });

      etaSortDirection = etaSortDirection === 'asc' ? 'desc' : 'asc';

      for (const row of rowsArray) {
        tbody.appendChild(row);
      }

      debouncedFilterTable({ target: { id: "sortTableByETA" } });
      filterRow.style.display = currentDisplay || "table-row";
      console.log("sortTableByETA, filter row display after:", filterRow.style.display);
    }

    function toggleCountryFilter(event) {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const filterRow = document.getElementById("filterRow");
      const currentDisplay = filterRow.style.display;
      console.log("toggleCountryFilter, filter row display before:", currentDisplay);

      countrySortState = (countrySortState + 1) % 3;
      debouncedFilterTable({ target: { id: "toggleCountryFilter" } });

      filterRow.style.display = currentDisplay || "table-row";
      console.log("toggleCountryFilter, filter row display after:", filterRow.style.display);
    }

    function sortTableByResult(event) {
      if (event && typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      const filterRow = document.getElementById("filterRow");
      const currentDisplay = filterRow.style.display;
      console.log("sortTableByResult, filter row display before:", currentDisplay);

      const table = document.getElementById("resultTable");
      const tbody = table.tBodies[0];
      const rowsArray = Array.from(tbody.rows).filter(row => row.style.display !== 'none');

      rowsArray.sort((a, b) => {
        const aText = a.cells[8].textContent.trim().toLowerCase();
        const bText = b.cells[8].textContent.trim().toLowerCase();

        return resultSortDirection === 'asc' ? aText.localeCompare(bText) : bText.localeCompare(aText);
      });

      resultSortDirection = resultSortDirection === 'asc' ? 'desc' : 'asc';

      for (const row of rowsArray) {
        tbody.appendChild(row);
      }

      debouncedFilterTable({ target: { id: "sortTableByResult" } });
      filterRow.style.display = currentDisplay || "table-row";
      console.log("sortTableByResult, filter row display after:", filterRow.style.display);
    }

    document.addEventListener('click', function (e) {
      if (e.target.classList.contains('copy-icon')) {
        e.stopPropagation();
        copyResultColumn();
      }
    });

    function exportToExcel() {
      const table = document.getElementById("resultTable");
      if (!table) {
        alert("No data available to export.");
        return;
      }

      const headers = Array.from(table.querySelectorAll("thead tr:first-child th")).map(th => th.textContent.trim().replace(/\s*\n\s*/g, ''));

      const rows = Array.from(table.querySelectorAll("tbody tr")).filter(row => row.style.display !== "none");

      const data = [headers];

      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll("td")).map(cell => {
          const tempDiv = document.createElement("div");
          tempDiv.innerHTML = cell.innerHTML;
          return tempDiv.textContent.trim();
        });
        data.push(cells);
      });

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "OrderChecking");
      XLSX.writeFile(workbook, "Order_Checking_System.xlsx");
    }
