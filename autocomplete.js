(function (global) {
    'use strict';

    const UTILS = {
        escapeRegExChars: function (value) {
            return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
        },
    };

    const KEYS = Object.freeze({
        ESC: 27,
        TAB: 9,
        ENTER: 13,
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,
    });

    const NOOP = function () { };

    const OPTIONAL = null;

    const WIDGET_CLASS = Object.freeze({
        CONTAINER: 'autocomplete-container',
        SUGGESTION: 'autocomplete-suggestion',
        NO_SUGGESTION: 'autocomplete-no-suggestion',
        SELECTED: 'autocomplete-selected',
        GROUP: 'autocomplete-group',
        HIGHLIGHT: 'autocomplete-highlight',
        HINT: 'autocomplete-hint',
    });

    const ORIENTATION = Object.freeze({
        AUTO: 'auto',
        BOTTOM: 'bottom',
        TOP: 'top',
    });

    const DEFAULT_OPTIOINS = Object.freeze({
        collection: [],//
        searchCollection: _searchCollection,//
        getSuggestionValue: _getSuggestionValue, //
        getSuggestionTitle: _getSuggestionTitle, //
        formatSuggestion: _formatSuggestion,

        noCache: false, //Boolean value indicating whether to cache suggestion results
        delimiter: OPTIONAL,	//String or RegExp, this splits input value and takes last part to as query for suggestions. Useful when for example you need to fill list of comma separated values.
        minChars: 1,	//Minimum number of characters required to trigger autosuggest
        preventBadQueries: true,	//Boolean value indicating if it should prevent future Ajax requests for queries with the same root if no results were returned. E.g. if Jam returns no suggestions, it will not fire for any future query this starts with Jam
        showNoSuggestionNotice: true,//When no matching results, display a notification label
        noSuggestionNotice: 'No results',//	Text or htmlString or Element or jQuery object for no matching results label
        orientation: ORIENTATION.Auto,//	Vertical orientation of the displayed suggestions, available values are auto, top, bottom. If set to auto, the suggestions will be orientated it the way this place them closer to middle of the view port
        groupBy: OPTIONAL,//property name of the suggestion data object, by which results should be grouped
        maxHeight: 300,//	Maximum height of the suggestions container in pixels
        zIndex: 9999,//'z-index' for suggestions container
    });

    function _searchCollection(query, collection, getValue, getTitle) {
        return Promise.resolve().then(function () {
            return collection.filter(function (item) {
                return getValue(item).toLowerCase().indexOf(query.toLowerCase()) !== -1;
            });
        });
    }

    function _getSuggestionValue(suggestion) {
        return suggestion.value || '';
    }

    function _getSuggestionTitle(suggestion) {
        return suggestion.title || '';
    }

    function _formatSuggestion(suggestion, query, index, options) {
        const value = options.getSuggestionValue(suggestion);
        if (query) {
            var pattern = '(' + UTILS.escapeRegExChars(query) + ')';

            return value.replace(new RegExp(pattern, 'gi'), '<span class="' + WIDGET_CLASS.HIGHLIGHT + '">$1<\/span>');
        }
        return value;
    }

    function AutocompleteHelper(element, options) {
        this.element = element;
        this.hintElement = null;

        this.options = DEFAULT_OPTIOINS;
        this.container = null;
        this.noSuggestionContainer = null;
        this.containerHeight = 0;

        this.resizeTimer = null;
        this.resizeDelay = 200;
        this.changeTimer = null;
        this.changeDelay = 200;
        this.blurTimer = null;
        this.blurDelay = 200;

        this.currentValue = '';
        this.query = '';
        this.selectedIndex = -1;
        this.suggestions = [];

        this.enabled = true;

        this.init(options);
    }

    AutocompleteHelper.prototype = Object.freeze((function () {
        return {
            init: init,
            setOptions: setOptions,
            mergeOptions: mergeOptions,
            updateWidget: updateWidget,
            onResize: onResize,
            onFocus: onFocus,
            onKeyDown: onKeyDown,
            onValueChange: onValueChange,
            onBlur: onBlur,
            onMouseOver: onMouseOver,
            onMouseOut: onMouseOut,
            onClick: onClick,
            valueChange: valueChange,
            handleSearchResult: handleSearchResult,
            setSelected: setSelected,
            select: select,
            showNoSuggestionNotice: showNoSuggestionNotice,
            enter: enter,
            moveUp: moveUp,
            moveDown: moveDown,
            removeSelectedStatus: removeSelectedStatus,
            adjustScroll: adjustScroll,
            fixPosition: fixPosition,
            show: show,
            hide: hide,
            enable: enable,
            disable: disable
        }

        function init(suppliedOptions) {
            this.mergeOptions(suppliedOptions);

            const element = this.element;
            const options = this.options;

            // Remove autocomplete attribute to prevent native suggestions:
            element.setAttribute('autocomplete', 'off');

            //clone input
            const hintElement = this.element.cloneNode();
            hintElement.id = '';
            _addClass(hintElement,WIDGET_CLASS.HINT);
            _changeElementStyle(hintElement, {
                position: 'absolute',
                left: element.offsetLeft,
                top: element.offsetTop,
                zIndex: -1,
            });
            document.body.appendChild(hintElement);
            this.hintElement = hintElement;

            _changeElementStyle(element, {
                backgroundColor: 'transparent',
            });

            //create container
            const noSuggestionContainer = document.createElement('div');
            noSuggestionContainer.className = WIDGET_CLASS.NO_SUGGESTION;
            noSuggestionContainer.innerHTML = options.noSuggestionNotice;
            this.noSuggestionContainer = noSuggestionContainer;

            const container = document.createElement('div');
            container.className = WIDGET_CLASS.CONTAINER;
            _changeElementStyle(container, {
                position: 'absolute',
                display: 'none',
            });
            document.body.appendChild(container);
            this.container = container;

            //add event listener
            element.addEventListener('focus', () => this.onFocus(), false);
            element.addEventListener('keydown', (event) => this.onKeyDown(event), false);
            element.addEventListener('input', () => this.onValueChange(), false);
            element.addEventListener('blur', () => this.onBlur(), false);

            container.addEventListener('mouseover', (event) => this.onMouseOver(event), false);
            container.addEventListener('mouseout', (event) => this.onMouseOut(event), false);
            container.addEventListener('click', (event) => this.onClick(event), false);

            window.addEventListener('resize', () => this.onResize(), false);

            this.updateWidget();

        }

        function setOptions(suppliedOptions) {
            this.mergeOptions(suppliedOptions);

            this.updateWidget();
        }

        function mergeOptions(suppliedOptions) {
            this.options = Object.freeze(Object.assign({}, this.options, suppliedOptions));
        }

        function updateWidget() {
            const options = this.options;

            const container = this.container;

            _changeElementStyle(container, {
                maxHeight: options.maxHeight,
                zIndex: options.zIndex,
            });
        }

        function onResize() {
            if (this.enabled) {
                clearTimeout(this.resizeTimer);
                this.resizeTimer = setTimeout(() => {
                    const container = this.container;
                    if (container.style.display !== 'none') {
                        this.fixPosition();
                    }
                }, this.resizeDelay);
            }
        }

        function onFocus() {
            if (this.enabled) {
                this.fixPosition();
                this.onValueChange();
            }
        }

        function onKeyDown(event) {
            if (this.enabled) {
                switch (event.keyCode) {
                    case KEYS.ENTER: this.enter();
                        break;
                    case KEYS.UP: this.moveUp();
                        break;
                    case KEYS.DOWN: this.moveDown();
                        break;
                }
            }
        }

        function onValueChange() {
            if (this.enabled) {
                clearTimeout(this.changeTimer);
                this.changeTimer = setTimeout(() => this.valueChange(), this.changeDelay);
            }
        }

        function valueChange() {
            const options = this.options;
            const value = this.element.value;
            const query = _getQuery(value, options.delimiter);

            if (this.query === query) {
                if (query.length >= options.minChars) {
                    this.show();
                }
            } else {
                this.currentValue = value;
                this.query = query;
                this.selectedIndex = -1;
                if (query.length < options.minChars) {
                    this.hide();
                } else {
                    options.searchCollection(query, options.collection, options.getSuggestionValue, options.getSuggestionTitle).then((suggestions) => this.handleSearchResult(suggestions));
                }
            }
        }

        function onBlur() {
            if (this.enabled) {
                this.blurTimer = setTimeout(() => this.hide(), this.blurDelay);
            }
        }

        function onMouseOver(event) {
            const target = event.target, className = target.className;
            if (className && className.indexOf(WIDGET_CLASS.SUGGESTION) !== -1) {
                this.setSelected(target.getAttribute('data-index'));
            }
            event.stopPropagation();
        }

        function onMouseOut(event) {
            if (event.target === event.currentTarget) {
                this.removeSelectedStatus();
            }
            event.stopPropagation();
        }

        function onClick(event) {
            clearTimeout(this.blurTimer);

            const suggestionEle = _findSuggestionElement(event.target, this.container);
            if (suggestionEle) {
                this.select(suggestionEle.getAttribute('data-index'));
            }
            event.stopPropagation();
        }

        function handleSearchResult(suggestions) {
            const options = this.options;
            if (suggestions.length) {
                this.suggestions = suggestions;
                const query = this.query;
                let html = '';
                suggestions.forEach(function (suggestion, index) {
                    html += _getSuggestionHtml(index, suggestion, query, options)
                });

                this.container.innerHTML = html;
                this.show();

                this.hintElement.value = options.getSuggestionValue(suggestions[0]);
            } else {
                if (options.showNoSuggestionNotice) {
                    this.showNoSuggestionNotice();
                } else {
                    this.hide();
                }
            }
        }

        function setSelected(index) {
            const selectedClass = WIDGET_CLASS.SELECTED;
            const container = this.container;
            const suggestionsEle = container.getElementsByClassName(WIDGET_CLASS.SUGGESTION), total = suggestionsEle.length;

            if (total) {
                const selectedIndex = this.selectedIndex;
                if (selectedIndex !== -1) {
                    //remove class
                    _removeClass(suggestionsEle[selectedIndex], selectedClass);
                }

                if (index > -1 && index < total) {
                    this.selectedIndex = index;
                    const currentEle = suggestionsEle[index];
                    _addClass(currentEle, selectedClass);
                    return currentEle;
                }

            } else {
                this.selectedIndex = -1;
            }

            return null;
        }

        function select(index) {
            this.hide();
            const options = this.options;
            const suggestion = this.suggestions[index];
            const value = options.getSuggestionValue(suggestion);
            this.currentValue = _getValue(this.currentValue, options.delimiter, value);
            this.element.value = this.currentValue;
        }

        function showNoSuggestionNotice() {
            const container = this.container;
            container.innerHTML = '';
            container.appendChild(this.noSuggestionContainer);
            this.show();
        }

        function enter() {
            const selectedIndex = this.selectedIndex;
            if (selectedIndex === -1) {
                this.hide();
            } else {
                this.select(selectedIndex);
            }
        }

        function moveUp() {
            const selectedIndex = this.selectedIndex;
            if (selectedIndex === -1) {
                return;
            }
            if (selectedIndex === 0) {
                this.removeSelectedStatus();
                this.element.value = this.currentValue;
                return;
            }

            this.adjustScroll(selectedIndex - 1);
        }

        function moveDown() {
            const selectedIndex = this.selectedIndex;

            if (selectedIndex === (this.suggestions.length - 1)) {
                return;
            }

            this.adjustScroll(selectedIndex + 1);
        }

        function removeSelectedStatus() {
            this.selectedIndex = -1;

            const selectedClass = WIDGET_CLASS.SELECTED;
            const elements = this.container.getElementsByClassName(selectedClass);
            if (elements.length) {
                _removeClass(elements[0], selectedClass);
            }
        }

        function adjustScroll(index) {
            const currentEle = this.setSelected(index);

            if (currentEle) {
                const container = this.container;
                const containerHeight = container.offsetHeight;
                const options = this.options;

                if (containerHeight >= options.maxHeight) {
                    const height = currentEle.offsetHeight;
                    const offsetTop = currentEle.offsetTop;
                    const upperBound = container.scrollTop;
                    const lowerBound = upperBound + containerHeight - height;
                    if (offsetTop < upperBound) {
                        container.scrollTop = offsetTop;
                    } else if (offsetTop > lowerBound) {
                        container.scrollTop = offsetTop + height - containerHeight;
                    }
                }
                const value = options.getSuggestionValue(this.suggestions[index]);
                this.element.value = _getValue(this.currentValue, options.delimiter, value);
            }
        }

        function show() {
            const container = this.container;
            _changeElementStyle(container, {
                display: 'block',
            });
        }

        function hide() {
            const container = this.container;
            _changeElementStyle(container, {
                display: 'none',
            });
        }

        function disable() {
            this.enabled = false;
            this.hide();
        }

        function enable() {
            this.enabled = true;
        }

        function fixPosition() {
            const element = this.element;
            const container = this.container;
            const options = this.options;
            const orientation = options.orientation;
            const height = element.offsetHeight;
            const containerHeight = this.containerHeight;//get height when showing suggestions

            const style = {
                width: element.offsetWidth,
                top: element.offsetTop,
                left: element.offsetLeft
            }

            if (orientation === ORIENTATION.AUTO) {
                const windowHeight = window.innerHeight;
                const scrollTop = window.scrollY;
                const offsetTop = style.top;
                const topOverflow = offsetTop - scrollY - containerHeight;
                const bottomOverflow = windowHeight + scrollTop - (offsetTop + height + containerHeight);

                if (topOverflow > bottomOverflow) {
                    orientation = ORIENTATION.TOP;
                } else {
                    orientation = ORIENTATION.LEFT;
                }
            }

            if (orientation === ORIENTATION.TOP) {
                style.top -= containerHeight;
            } else {
                style.top += height;
            }

            _changeElementStyle(container, style);

        }

        function _getQuery(value, delimiter) {
            if (delimiter) {
                const lastIndex = value.lastIndexOf(delimiter);
                if (lastIndex > -1) {
                    return value.substring(lastIndex).trim();
                }
            }
            return value;
        }

        function _getValue(currentValue, delimiter, value) {
            if (delimiter) {
                const lastIndex = currentValue.lastIndexOf(delimiter);
                if (lastIndex > -1) {
                    return currentValue.substring(0, lastIndex) + delimiter + value;
                }
            }
            return value;
        }

        function _changeElementStyle(element, style) {
            for (let key in style) {
                element.style[key] = style[key];
            }
        }

        function _getSuggestionHtml(index, suggestion, query, options) {
            return '<div class="' + WIDGET_CLASS.SUGGESTION + '" data-index="' + index + '" title="' + options.getSuggestionTitle(suggestion) + '">' + options.formatSuggestion(suggestion, query, index, options) + '</div>';
        }

        function _removeClass(element, className) {
            element.className = element.className.replace(className, '');
        }

        function _addClass(element, className) {
            element.className = element.className.trim() + ' ' + className;
        }

        function _findSuggestionElement(target, container) {
            const suggestionClass = WIDGET_CLASS.SUGGESTION;
            let element = target;
            while (element !== container) {
                const className = element.className;
                if (className && className.indexOf(suggestionClass) !== -1) {
                    return element;
                }
                element = element.parentNode;
            }
            return null;
        }
    })())

    function Autocomplete(cssSelector, options) {
        const element = document.querySelector(cssSelector);
        if (element) {
            const helper = new AutocompleteHelper(element, options);
            this.setOptions = () => helper.setOptions();
            this.enable = () => helper.enable();
            this.disable = () => helper.disable();
        }

    }

    Autocomplete.orientation = ORIENTATION;

    Autocomplete.defaults = DEFAULT_OPTIOINS;

    global.Autocomplete = Autocomplete;
})(window);
