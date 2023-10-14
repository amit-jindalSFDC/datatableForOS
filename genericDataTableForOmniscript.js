import { LightningElement, api, track } from "lwc";
import { OmniscriptBaseMixin } from "omnistudio/omniscriptBaseMixin";

export default class GenericDataTableForOmniscript extends OmniscriptBaseMixin(
  LightningElement
) {
  // JS Properties
  @api showSearchbar;
  @api isPagination;
  @api hideCheckboxColumn;
  @api maxRowSelection;
  //@api records ; //All records available in the data table
  //@api columns ; //columns information available in the data table
  @api keyField = "Id";
  @api searchLabel = "Search";
  @api errorForm = "Desert";
  @api errorMessage = "No records are found for the search !";
  @track _records;
  @track recordsToDisplay; //Records to be displayed on the page
  pageSizeOptions = [5, 10, 25, 50, 75, 100]; //Page size options
  totalRecords = 0; //Total no.of records
  pageSize; //No.of records to be displayed per page
  totalPages; //Total no.of pages
  pageNumber = 1; //Page number
  @track sortBy;
  @track sortDirection;
  @track searchTerms;
  @track _columns;
  selectedRowsKeyField = [];
  selectedRecord = [];

  connectedCallback() {
    if (!this.isPagination && this._records && this._records.length > 0) {
      this.pageSize = this.totalRecords;
      this.setUpTable();
    }
  }

  @api
  get columns() {
    return this._columns;
  }
  set columns(value) {
    const columns = JSON.parse(JSON.stringify(value));
    if (columns && Array.isArray(columns)) {
      columns.forEach((ele) => {
        if (ele.typeAttributes) {
          ele.typeAttributes = JSON.parse(ele.typeAttributes);
        }
        if (ele.cellAttributes) {
          ele.cellAttributes = JSON.parse(ele.cellAttributes);
        }
      });
      this._columns = columns;
    }
  }

  @api
  get filterKey() {
    return this.searchTerms;
  }
  set filterKey(value) {
    this.searchTerms = value && value.split(",");
  }
  handleSearch(event) {
    const searchText = event.target.value;
    this.isSearchLoading = true;
    // Debouncing this method: Do not update the reactive property as long as this function is
    // being called within a delay of DELAY.
    window.clearTimeout(this.delayTimeout);
    this.delayTimeout = setTimeout(() => {
      this._records = this.search(
        this.searchTerms,
        searchText,
        this.originalRecords
      );
      this.paginationHelper();
      this.isSearchLoading = false;
    }, 300);
  }

  search(searchTerms, searchText, records) {
    if (!searchText) {
      return records;
    }
    return records.filter((record) => {
      for (let index = 0; index < searchTerms.length; index++) {
        const element = searchTerms[index];
        if (searchTerms[index].includes(".")) {
          const keys = searchTerms[index].split(".");
          if (
            record[keys[0]][keys[1]] &&
            record[keys[0]][keys[1]]
              .toLowerCase()
              .includes(searchText.toLowerCase())
          ) {
            return true;
          }
        } else if (
          record[element] &&
          record[element].toLowerCase().includes(searchText.toLowerCase())
        ) {
          return true;
        }
      }
      return false;
    });
  }

  get disableFirst() {
    return this.pageNumber == 1;
  }

  get disableLast() {
    return this.pageNumber == this.totalPages;
  }

  @api
  get records() {
    return this._records;
  }
  set records(value) {
    this.originalRecords = value;
    this._records = value;
    if (this._records && this._records.length > 0) {
      this.setUpTable();
    }
  }
  setUpTable() {
    this.totalRecords = this._records.length; // update total records count
    this.pageSize = this.pageSize || this.pageSizeOptions[0]; //set pageSize with default value as first option
    this.paginationHelper(); // call helper menthod to update pagination logic
  }
  handleRecordsPerPage(event) {
    this.pageSize = event.target.value;
    this.paginationHelper();
  }
  previousPage() {
    this.pageNumber = this.pageNumber - 1;
    this.paginationHelper();
  }
  nextPage() {
    this.pageNumber = this.pageNumber + 1;
    this.paginationHelper();
  }
  firstPage() {
    this.pageNumber = 1;
    this.paginationHelper();
  }
  lastPage() {
    this.pageNumber = this.totalPages;
    this.paginationHelper();
  }
  paginationHelper() {
    this.recordsToDisplay = [];
    // calculate total pages
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    // set page number
    if (this.pageNumber <= 1) {
      this.pageNumber = 1;
    } else if (this.pageNumber >= this.totalPages) {
      this.pageNumber = this.totalPages;
    }
    // set records to display on current page
    let start = (this.pageNumber - 1) * this.pageSize;
    let end = this.pageNumber * this.pageSize;
    this.recordsToDisplay = this._records.slice(start, end);
    if (this.template.querySelector('[data-id="datatable"]') && this.selectedRowsKeyField.length > 0) {
      this.template.querySelector('[data-id="datatable"]').selectedRows = this.selectedRowsKeyField;
    }
  }

  getSelectedRows(event) {
    let loadedItemsSet = new Set(); // List of items currently loaded for the current view.
    let updatedItemsSet = new Set(); //List of newly selected or de-selected items.
    let selectedItemsSet = new Set(this.selectedRowsKeyField); // List of selected items we maintain.
    let selectedRows = new Set(); //List of Selected Records(whole data)

    this.recordsToDisplay.forEach((ele) => {
      loadedItemsSet.add(ele[this.keyField]);
    });

    if (event.detail.selectedRows) {
      event.detail.selectedRows.forEach((ele) => {
        updatedItemsSet.add(ele[this.keyField]);
      });

      // Add any new items to the selectedRows list
      updatedItemsSet.forEach((keyField) => {
        if (!selectedItemsSet.has(keyField)) {
          selectedItemsSet.add(keyField);
        }
      });
    }

    loadedItemsSet.forEach((keyField) => {
      if (selectedItemsSet.has(keyField) && !updatedItemsSet.has(keyField)) {
        selectedItemsSet.delete(keyField); // Remove any items that were unselected.
      }
    });

    this.selectedRowsKeyField = [...selectedItemsSet];
    const noofRows = this.selectedRowsKeyField.length;
    if (noofRows > this.maxRowSelection) {
      this.selectedRowsKeyField = this.selectedRowsKeyField.slice(noofRows - this.maxRowSelection, noofRows);
      selectedItemsSet = new Set(this.selectedRowsKeyField);
    }

    this._records.forEach((element) => {
      if (selectedItemsSet.has(element[this.keyField])) {
        selectedRows.add(element);
      }
    });

    this.selectedRecord = [...selectedRows];
    let selectionOfRecords = {}; //Creating another object to add selectedRecord list into selectedRows node.
    selectionOfRecords.selectedRows = [...this.selectedRecord]; //This selectedRows is not the selectedRows which is declared above.
    this.omniUpdateDataJson(selectionOfRecords);
    this.omniValidate();
  }

  handleRowAction(event) {
    const action = event?.detail?.action;
    switch (action.name) {
      case "disable_action":
        break;
      default:
        this.omniUpdateDataJson(event?.detail?.row);
        this.omniValidate();
        this.omniNextStep();
    }
  }

  doSorting(event) {
    this.sortBy = event.detail.fieldName;
    this.sortDirection = event.detail.sortDirection;
    this.sortData(this.sortBy, this.sortDirection);
  }

  sortData(fieldname, direction) {
    //let parseData = JSON.parse(JSON.stringify(this.records));
    const parseData = [...this._records];
    // Return the value stored in the field
    let keyValue = (a) => {
      return a[fieldname];
    };
    // cheking reverse direction
    let isReverse = direction === "asc" ? 1 : -1;
    // sorting data
    parseData.sort((x, y) => {
      x = keyValue(x) ? keyValue(x) : ""; // handling null values
      y = keyValue(y) ? keyValue(y) : "";
      // sorting values based on direction
      return isReverse * ((x > y) - (y > x));
    });
    this._records = parseData;
    this.paginationHelper();
  }
  @api
  checkValidity() {
    return true;
  }
}