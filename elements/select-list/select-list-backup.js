// select-list.js
class SelectList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .select-list {
          position: relative;
          display: inline-block;
          width: 100%;
          height: 100%;
        }

        .selected-values {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          padding: 4px;
          border: 1px solid #ccc;
          border-radius: 4px 4px 0 0;
          cursor: pointer;
          background-color: #fff;
          flex: 1;
          min-height: 36px;
          box-sizing: border-box;
        }
        
        .selected-value {
          display: flex;
          align-items: center;
          margin: 2px;
          padding: 2px 4px;
          background-color: #f2f2f2;
          border-radius: 4px;
        }
        
        .selected-value span {
          margin-right: 4px;
        }
        
        .remove-btn {
          padding: 0;
          border: none;
          background-color: transparent;
          color: #999;
          font-size: 12px;
          cursor: pointer;
        }
        
        .clear-btn {
          margin-left: 4px;
          padding: 2px 4px;
          border: none;
          border-radius: 4px;
          background-color: #ccc;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
        }
        
        .options-container {
          visibility: hidden;
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid #ccc;
          border-top: none;
          border-radius: 0 0 4px 4px;
          background-color: #fff;
          z-index: 1;
          opacity: 0;
          transition: visibility 0s, opacity 0.2s;
        }
        
        .options-container.show {
          visibility: visible;
          opacity: 1;
        }
        
        .search-bar {
          width: 100%;
          padding: 8px;
          border: none;
          border-bottom: 1px solid #ccc;
          outline: none;
        }
        
        .option {
          display: flex;
          align-items: center;
          padding: 8px;
          cursor: pointer;
        }
        
        .option:hover,
        .option.highlighted {
          background-color: #f2f2f2;
        }
        
        .option.selected {
          background-color: #e0e0e0;
        }
        
        .option-checkbox {
          margin-right: 8px;
        }
        
        .no-options {
          padding: 8px;
          font-style: italic;
          color: #999;
          cursor: default;
        }

        .placeholder {
          font-style: italic;
        }
      </style>
      <div class="select-list">
        <div class="selected-values" tabindex="0" aria-haspopup="listbox" aria-expanded="false"></div>
        <div class="options-container" tabindex="-1" role="listbox">
          <input type="text" class="search-bar" placeholder="Search..." aria-label="Search options">
          <div class="options-list"></div>
        </div>
      </div>
    `;
    
    this.selectedValues = [];
    this.options = [];
    this.filteredOptions = [];
    this.highlightedIndex = 0;
    this.multiple = false;
    this.searchable = false;
    this.disabled = false;
    this.placeholder = 'Select...';
    this.debug = false;

    this.selectedValuesContainer = this.shadowRoot.querySelector('.selected-values');
    this.optionsContainer = this.shadowRoot.querySelector('.options-container');
    this.searchBar = this.shadowRoot.querySelector('.search-bar');
    this.optionsList = this.shadowRoot.querySelector('.options-list');

    this.selectedValuesContainer.addEventListener('click', this.toggleOptions.bind(this));
    this.selectedValuesContainer.addEventListener('keydown', this.handleKeydown.bind(this));
    this.optionsContainer.addEventListener('keydown', this.handleOptionsKeydown.bind(this));
    this.searchBar.addEventListener('input', this.filterOptions.bind(this));
    this.addEventListener('blur', this.handleBlur.bind(this), true);
    this.addEventListener('click', this.handleClick.bind(this));

    this.init();
  }

  init() {
    this.updateSearchable(this.getAttribute('searchable'));
    this.updateDisabled(this.getAttribute('disabled'));
    this.updatePlaceholder(this.getAttribute('placeholder'));
  }

  static get observedAttributes() {
    return ['options', 'class', 'debug', 'value', 'multiple', 'searchable', 'disabled', 'placeholder'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    switch (name) {
      case 'options':
        this.updateOptions(newValue);
        break;
      case 'class':
        this.updateClass(newValue);
        break;
      case 'debug':
        this.updateDebug(newValue);
        break;
      case 'value':
        this.updateValue(newValue);
        break;
      case 'multiple':
        this.updateMultiple(newValue);
        break;
      case 'searchable':
        this.updateSearchable(newValue);
        break;      
      case 'disabled':
        this.updateDisabled(newValue);
        break;
      case 'placeholder':
        this.updatePlaceholder(newValue);
        break;          
    }
  }

  updateOptions(newValue) {
    try {
      this.options = JSON.parse(newValue);
      this.filteredOptions = this.options;
      this.renderOptions();
    } catch (error) {
      this.options = [];
      this.filteredOptions = [];
      this.renderErrorMessage('Error parsing options');
      this.logError('Error parsing options', error);
    }
  }

  updateClass(newValue) {
    this.shadowRoot.querySelector('.select-list').classList.add(...newValue.split(' '));
  }

  updateDebug(newValue) {
    this.debug = newValue !== null;
  }

  updateValue(newValue) {
    if (newValue) {
      const selectedValues = newValue.split(',');
      selectedValues.forEach(value => {
        const option = this.options.find(option => option.value === value);
        if (option) {
          this.selectOption(option);
        }
      });
    } else {
      this.selectedValues = [];
      this.updateSelectedValuesDisplay();
    }
    this.updateClearButtonVisibility();
  }

  updateMultiple(newValue) {
    this.multiple = newValue !== null;
  }

  updateSearchable(newValue) {
    this.searchable = newValue !== null;
    this.searchBar.style.display = this.searchable ? 'block' : 'none';
  }

  updateDisabled(newValue) {
    this.disabled = newValue !== null;
    this.selectedValuesContainer.classList.toggle('disabled', this.disabled);
    this.optionsContainer.classList.toggle('disabled', this.disabled);
  }

  updatePlaceholder(newValue) {
    this.placeholder = newValue || 'Select...';
    this.updateSelectedValuesDisplay();
  }

  renderOptions() {
    this.optionsList.innerHTML = '';

    if (this.filteredOptions.length === 0) {
      this.renderNoOptions();
    } else {
      this.filteredOptions.forEach((option, index) => {
        const optionElement = this.createOptionElement(option, index);
        this.optionsList.appendChild(optionElement);
      });
    }
  }

  renderNoOptions() {
    const noOptionsElement = document.createElement('div');
    noOptionsElement.classList.add('no-options');
    noOptionsElement.textContent = 'No options';
    this.optionsList.appendChild(noOptionsElement);
  }

  renderErrorMessage(message) {
    this.optionsList.innerHTML = '';
    const errorMessageElement = document.createElement('div');
    errorMessageElement.classList.add('error-message');
    errorMessageElement.textContent = message;
    this.optionsList.appendChild(errorMessageElement);
  }


  createOptionElement(option, index) {
    const optionElement = document.createElement('div');
    optionElement.classList.add('option');
    optionElement.dataset.value = option.value;
    optionElement.setAttribute('role', 'option');
    optionElement.setAttribute('aria-selected', this.selectedValues.some(selectedValue => selectedValue.value === option.value));
    optionElement.addEventListener('click', this.handleOptionClick.bind(this, option));

    const checkboxElement = document.createElement('input');
    checkboxElement.type = 'checkbox';
    checkboxElement.classList.add('option-checkbox');
    checkboxElement.checked = this.selectedValues.some(selectedValue => selectedValue.value === option.value);
    checkboxElement.disabled = true;
    optionElement.appendChild(checkboxElement);

    const labelElement = document.createElement('span');
    labelElement.textContent = option.label;
    optionElement.appendChild(labelElement);

    if (index === this.highlightedIndex) {
      optionElement.classList.add('highlighted');
    }

    if (checkboxElement.checked) {
      optionElement.classList.add('selected');
    }

    return optionElement;
  }


  handleSelectedValuesClick(event) {
    console.log("handleSelectedValuesClick!");
    if (event.target.closest('.remove-btn') || event.target.closest('.clear-btn')) {
      return;
    }
    this.toggleOptions();
  }

  toggleOptions(event) {
    if (!this.disabled) {
      event.stopPropagation();
      this.optionsContainer.classList.toggle('show');

      if (this.optionsContainer.classList.contains('show')) {
        this.showOptions();
      } else {
        this.hideOptions();
      }
    }
  }

  showOptions() {
    this.searchBar.focus();
    this.highlightedIndex = 0;
    this.renderOptions();
    this.optionsContainer.setAttribute('tabindex', '0');
    this.selectedValuesContainer.setAttribute('aria-expanded', 'true');
  }

  hideOptions() {
    this.searchBar.value = '';
    this.filterOptions();
    this.optionsContainer.setAttribute('tabindex', '-1');
    this.selectedValuesContainer.setAttribute('aria-expanded', 'false');
    this.optionsContainer.classList.remove('show');
  }

  filterOptions() {
    try {
      const searchTerm = this.searchBar.value.toLowerCase();
      this.filteredOptions = this.options.filter(option =>
        option.label.toLowerCase().includes(searchTerm)
      );
      this.highlightedIndex = 0;
      this.renderOptions();
    } catch (error) {
      this.logError('Error filtering options', error);
    }
  }

  handleOptionClick(option) {
    if (!this.disabled) {
      if (this.multiple) {
        this.toggleOption(option);
      } else {
        this.selectOption(option);
        this.hideOptions();
      }
      this.renderOptions();
    }
  }

  toggleOption(option) {
    const index = this.selectedValues.findIndex(selectedValue => selectedValue.value === option.value);
    if (index !== -1) {
      this.removeSelectedValue(option);
    } else {
      this.selectOption(option);
    }
  }

  selectOption(option) {
    if (this.multiple) {
      if (!this.selectedValues.some(selectedValue => selectedValue.value === option.value)) {
        this.selectedValues.push(option);
      }
    } else {
      this.selectedValues = [option];
    }
    this.updateSelectedValuesDisplay();
    this.updateClearButtonVisibility();
    this.dispatchEvent(new CustomEvent('change', { detail: this.selectedValues.map(selectedValue => selectedValue.value) }));
    this.renderOptions();
  }

  removeSelectedValue(selectedValue) {
    const index = this.selectedValues.findIndex(value => value.value === selectedValue.value);
    if (index !== -1) {
      this.selectedValues.splice(index, 1);
      this.updateSelectedValuesDisplay();
      this.updateClearButtonVisibility();
      this.dispatchEvent(new CustomEvent('change', { detail: this.selectedValues.map(selectedValue => selectedValue.value) }));
      this.renderOptions();
    }
  }

  updateSelectedValuesDisplay() {
    this.selectedValuesContainer.innerHTML = '';

    if (this.selectedValues.length === 0) {
      const placeholderElement = document.createElement('span');
      placeholderElement.classList.add('placeholder');
      placeholderElement.textContent = this.placeholder;
      this.selectedValuesContainer.appendChild(placeholderElement);
    } else {
      this.selectedValues.forEach(selectedValue => {
        const selectedValueElement = document.createElement('div');
        selectedValueElement.classList.add('selected-value');

        const selectedValueText = document.createElement('span');
        selectedValueText.textContent = selectedValue.label;
        selectedValueElement.appendChild(selectedValueText);

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-btn');
        removeButton.textContent = '×';
        removeButton.addEventListener('click', this.removeSelectedValue.bind(this, selectedValue));
        selectedValueElement.appendChild(removeButton);

        this.selectedValuesContainer.appendChild(selectedValueElement);
      });

      const clearButton = document.createElement('button');
      clearButton.classList.add('clear-btn');

      if (this.multiple) {
        clearButton.textContent = 'Clear All';
      } else {
        clearButton.textContent = 'Clear';
      }
      clearButton.addEventListener('click', this.clearSelectedValues.bind(this));
      this.selectedValuesContainer.appendChild(clearButton);
    }
  }

  removeSelectedValue(selectedValue) {
    const index = this.selectedValues.findIndex(value => value.value === selectedValue.value);
    if (index !== -1) {
      this.selectedValues.splice(index, 1);
      this.updateSelectedValuesDisplay();
      this.updateClearButtonVisibility();
      this.dispatchEvent(new CustomEvent('change', { detail: this.selectedValues.map(selectedValue => selectedValue.value) }));
    }
  }

  clearSelectedValues() {
    this.selectedValues = [];
    this.updateSelectedValuesDisplay();
    this.updateClearButtonVisibility();
    this.dispatchEvent(new CustomEvent('change', { detail: this.selectedValues.map(selectedValue => selectedValue.value) }));
  }

  updateClearButtonVisibility() {
    const clearButton = this.selectedValuesContainer.querySelector('.clear-btn');
    if (clearButton) {
      clearButton.style.display = this.selectedValues.length > 0 ? 'inline-block' : 'none';
    }
  }

  handleDocumentClick(event) {
    const selectList = this.shadowRoot.host;
    if (!selectList.contains(event.target)) {
      this.hideOptions();
    }
  }

  handleKeydown(event) {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.toggleOptions(event);
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (!this.optionsContainer.classList.contains('show')) {
          this.toggleOptions(event);
        }
        break;
      case 'Tab':
        if (this.optionsContainer.classList.contains('show')) {
          event.preventDefault();
          this.searchBar.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.hideOptions();
        break;
    }
  }

  handleOptionsKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightNextOption();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightPreviousOption();
        break;
      case 'Enter':
        event.preventDefault();
        this.toggleHighlightedOption();
        break;
      case ' ':
        event.preventDefault();
        this.selectHighlightedOption();
        break;
      case 'Tab':
        event.preventDefault();
        this.highlightNextOption();
        break;
      case 'Escape':
        event.preventDefault();
        this.hideOptions();
        this.selectedValuesContainer.focus();
        break;
    }
  }

  toggleHighlightedOption() {
    const highlightedOption = this.filteredOptions[this.highlightedIndex];
    if (highlightedOption) {
      const isSelected = this.selectedValues.some(selectedValue => selectedValue.value === highlightedOption.value);
      if (isSelected) {
        this.removeSelectedValue(highlightedOption);
      } else {
        this.selectOption(highlightedOption);
      }
      this.renderOptions();
    }
  }

  highlightNextOption() {
    this.highlightedIndex = (this.highlightedIndex + 1) % this.filteredOptions.length;
    this.scrollToHighlightedOption();
    this.renderOptions();
  }

  highlightPreviousOption() {
    this.highlightedIndex = (this.highlightedIndex - 1 + this.filteredOptions.length) % this.filteredOptions.length;
    this.scrollToHighlightedOption();
    this.renderOptions();
  }

  selectHighlightedOption() {
    const highlightedOption = this.filteredOptions[this.highlightedIndex];
    if (highlightedOption) {
      this.handleOptionClick(highlightedOption);
    }
  }

  selectHighlightedOptionAndCloseDropdown() {
    if (this.optionsContainer.classList.contains('show')) {
      this.selectHighlightedOption();
      this.hideOptions();
    }
  }

  scrollToHighlightedOption() {
    const highlightedOption = this.optionsList.querySelector('.option.highlighted');
    if (highlightedOption) {
      highlightedOption.scrollIntoView({ block: 'nearest' });
    }
  }

  handleBlur(event) {
    if (!this.contains(event.relatedTarget)) {
      this.hideOptions();
    }
  }

  handleClick(event) {
    if (!this.contains(event.target)) {
      this.hideOptions();
    }
  }

  logError(message, error) {
    if (this.debug) {
      console.error(`${message}:`, error);
    }
  }
}

customElements.define('select-list', SelectList);