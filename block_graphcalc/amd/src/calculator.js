define('block_graphcalc/calculator', ['core/str'], function(Str) {
    'use strict';

    var SELECTORS = {
        EXPRESSION: '[data-region="expression"]',
        DOMAIN_START: '[data-region="domain-start"]',
        DOMAIN_END: '[data-region="domain-end"]',
        SAMPLES: '[data-region="samples"]',
        VALUE_AT: '[data-region="value-at"]',
        ERROR: '[data-region="error"]',
        RESULT: '[data-region="result"]',
        GRAPH: '[data-region="graph"]',
        GRAPH_LINE: '[data-region="graph-line"]',
        AXIS_X: '[data-region="axis-x"]',
        AXIS_Y: '[data-region="axis-y"]'
    };

    var GRAPH_DIMENSIONS = {
        width: 400,
        height: 240
    };

    var DEFAULTS = {
        domainStart: -10,
        domainEnd: 10,
        samples: 50,
        valueAt: 0
    };

    var ALLOWED_EXPRESSION = /^[0-9xX+\-*/^().\s]+$/;

    var LANGUAGE_KEYS = [
        {key: 'error:emptyexpression', component: 'block_graphcalc'},
        {key: 'error:invalidexpression', component: 'block_graphcalc'},
        {key: 'error:domain', component: 'block_graphcalc'},
        {key: 'error:evaluation', component: 'block_graphcalc'},
        {key: 'result:value', component: 'block_graphcalc', param: {x: '{x}', y: '{y}'}}
    ];

    /**
     * Format numbers for display to avoid long decimal strings.
     *
     * @param {number} value
     * @returns {string}
     */
    /**
     * Format a numeric value for display.
     *
     * @param {number} value
     * @returns {string}
     */
    function formatNumber(value) {
        if (!isFinite(value)) {
            return 'NaN';
        }
        if (Math.abs(value) >= 1000000 || Math.abs(value) < 0.0001) {
            return value.toExponential(4);
        }
        return Number(value.toFixed(6)).toString();
    }

    /**
     * Graphing calculator controller.
     *
     * @param {HTMLElement} root
     * @param {Object} config
     */
    /**
     * Graphing calculator controller.
     *
     * @param {HTMLElement} root
     * @param {Object} config
     */
    function Calculator(root, config) {
        if (!root) {
            throw new Error('Graphing calculator root element is required.');
        }

        this.root = root;
        this.config = config || {};
        this.state = {
            expression: '',
            domainStart: DEFAULTS.domainStart,
            domainEnd: DEFAULTS.domainEnd,
            samples: DEFAULTS.samples,
            valueAt: DEFAULTS.valueAt,
            evaluator: null
        };
        this.renderNonce = 0;

        this.strings = {
            emptyExpression: 'Enter an expression in terms of x (for example: x^2 + 3).',
            invalidExpression: 'The expression can only contain numbers, x, parentheses, spaces, and + - * / ^ operators.',
            domain: 'The domain start must be less than the domain end.',
            evaluation: 'Unable to evaluate the expression for at least one sampled x value.',
            resultTemplate: 'f({x}) = {y}'
        };

        this.cacheElements();
        this.bindEvents();
        this.initialiseFromInputs();
        this.loadStrings();
        this.refresh();
    }

    Calculator.prototype.cacheElements = function() {
        this.elements = {
            expression: this.root.querySelector(SELECTORS.EXPRESSION),
            domainStart: this.root.querySelector(SELECTORS.DOMAIN_START),
            domainEnd: this.root.querySelector(SELECTORS.DOMAIN_END),
            samples: this.root.querySelector(SELECTORS.SAMPLES),
            valueAt: this.root.querySelector(SELECTORS.VALUE_AT),
            error: this.root.querySelector(SELECTORS.ERROR),
            result: this.root.querySelector(SELECTORS.RESULT),
            graph: this.root.querySelector(SELECTORS.GRAPH),
            graphLine: this.root.querySelector(SELECTORS.GRAPH_LINE),
            axisX: this.root.querySelector(SELECTORS.AXIS_X),
            axisY: this.root.querySelector(SELECTORS.AXIS_Y)
        };

        for (var key in this.elements) {
            if (Object.prototype.hasOwnProperty.call(this.elements, key)) {
                if (!this.elements[key]) {
                    throw new Error('Missing graph calculator element for ' + key);
                }
            }
        }
    };

    Calculator.prototype.bindEvents = function() {
        var self = this;
        this.elements.expression.addEventListener('input', function(event) {
            self.setState({expression: event.target.value});
        });
        this.elements.domainStart.addEventListener('change', function(event) {
            self.setState({domainStart: self.parseNumber(event.target.value, self.state.domainStart)});
        });
        this.elements.domainEnd.addEventListener('change', function(event) {
            self.setState({domainEnd: self.parseNumber(event.target.value, self.state.domainEnd)});
        });
        this.elements.samples.addEventListener('change', function(event) {
            self.setState({samples: self.parseSamples(event.target.value)});
        });
        this.elements.valueAt.addEventListener('input', function(event) {
            self.setState({valueAt: self.parseNumber(event.target.value, self.state.valueAt)});
        });
    };

    Calculator.prototype.initialiseFromInputs = function() {
        this.state.expression = this.elements.expression.value || '';
        this.state.domainStart = this.parseNumber(this.elements.domainStart.value, DEFAULTS.domainStart);
        this.state.domainEnd = this.parseNumber(this.elements.domainEnd.value, DEFAULTS.domainEnd);
        this.state.samples = this.parseSamples(this.elements.samples.value);
        this.state.valueAt = this.parseNumber(this.elements.valueAt.value, DEFAULTS.valueAt);
    };

    Calculator.prototype.loadStrings = function() {
        var self = this;
        Str.get_strings(LANGUAGE_KEYS).then(function(results) {
            self.strings.emptyExpression = results[0];
            self.strings.invalidExpression = results[1];
            self.strings.domain = results[2];
            self.strings.evaluation = results[3];
            self.strings.resultTemplate = results[4];
            self.refresh();
        }).catch(function() {
            window.console.warn('block_graphcalc: Failed to load language strings, using defaults.');
        });
    };

    Calculator.prototype.parseNumber = function(value, fallback) {
        var parsed = parseFloat(value);
        return isFinite(parsed) ? parsed : fallback;
    };

    Calculator.prototype.parseSamples = function(value) {
        var parsed = parseInt(value, 10);
        if (!isFinite(parsed) || parsed < 10) {
            return DEFAULTS.samples;
        }
        return Math.min(parsed, 200);
    };

    Calculator.prototype.setState = function(patch) {
        for (var key in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                this.state[key] = patch[key];
            }
        }
        this.refresh();
    };

    Calculator.prototype.refresh = function() {
        var expression = this.state.expression.trim();
        if (!expression.length) {
            this.showError(this.strings.emptyExpression);
            this.clearGraph();
            return;
        }

        var sanitized = this.sanitizeExpression(expression);
        if (!sanitized.ok) {
            this.showError(this.strings.invalidExpression);
            this.clearGraph();
            return;
        }

        if (this.state.domainStart >= this.state.domainEnd) {
            this.showError(this.strings.domain);
            this.clearGraph();
            return;
        }

        var evaluator = this.createEvaluator(sanitized.expression);
        if (!evaluator.ok) {
            this.showError(this.strings.invalidExpression);
            this.clearGraph();
            return;
        }
        this.state.evaluator = evaluator.fn;

        var sampling = this.samplePoints(this.state.evaluator, this.state.domainStart, this.state.domainEnd, this.state.samples);
        if (!sampling.ok) {
            this.showError(this.strings.evaluation);
            this.clearGraph();
            return;
        }

        this.drawGraph(sampling.points, sampling.bounds);
        this.showResult(this.state.valueAt, this.evaluateAt(this.state.evaluator, this.state.valueAt));
    };

    Calculator.prototype.sanitizeExpression = function(expression) {
        if (!ALLOWED_EXPRESSION.test(expression)) {
            return {ok: false};
        }
        var converted = expression.replace(/X/g, 'x').replace(/\^/g, '**');
        return {ok: true, expression: converted};
    };

    Calculator.prototype.createEvaluator = function(expression) {
        try {
            var fn = new Function('x', '\'use strict\'; return (' + expression + ');'); // eslint-disable-line no-new-func
            var probe = fn(0);
            if (typeof probe === 'undefined') {
                return {ok: false};
            }
            return {ok: true, fn: fn};
        } catch (error) {
            return {ok: false};
        }
    };

    Calculator.prototype.evaluateAt = function(fn, x) {
        try {
            var value = fn(x);
            if (!isFinite(value)) {
                throw new Error('Non-finite result');
            }
            return value;
        } catch (error) {
            return NaN;
        }
    };

    Calculator.prototype.samplePoints = function(fn, domainStart, domainEnd, samples) {
        var points = [];
        var step = (domainEnd - domainStart) / Math.max(samples - 1, 1);
        var minY = Number.POSITIVE_INFINITY;
        var maxY = Number.NEGATIVE_INFINITY;

        for (var index = 0; index < samples; index++) {
            var x = domainStart + (step * index);
            var y = this.evaluateAt(fn, x);
            if (!isFinite(y)) {
                continue;
            }
            points.push({x: x, y: y});
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        if (!points.length || !isFinite(minY) || !isFinite(maxY)) {
            return {ok: false};
        }

        if (minY === maxY) {
            var padding = Math.max(1, Math.abs(minY) * 0.5);
            minY -= padding;
            maxY += padding;
        }

        return {
            ok: true,
            points: points,
            bounds: {minY: minY, maxY: maxY}
        };
    };

    Calculator.prototype.drawGraph = function(points, bounds) {
        var width = GRAPH_DIMENSIONS.width;
        var height = GRAPH_DIMENSIONS.height;
        var domainStart = this.state.domainStart;
        var domainRange = this.state.domainEnd - this.state.domainStart;
        var rangeY = bounds.maxY - bounds.minY;

        var commands = [];
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            var xRatio = (point.x - domainStart) / domainRange;
            var yRatio = (point.y - bounds.minY) / rangeY;
            var svgX = xRatio * width;
            var svgY = height - (yRatio * height);
            var prefix = i === 0 ? 'M' : 'L';
            commands.push(prefix + svgX.toFixed(2) + ' ' + svgY.toFixed(2));
        }

        this.elements.graphLine.setAttribute('d', commands.join(' '));
        this.updateAxis(bounds);
    };

    Calculator.prototype.updateAxis = function(bounds) {
        var width = GRAPH_DIMENSIONS.width;
        var height = GRAPH_DIMENSIONS.height;
        var domainStart = this.state.domainStart;
        var domainEnd = this.state.domainEnd;
        var domainRange = domainEnd - domainStart;
        var rangeY = bounds.maxY - bounds.minY;

        if (bounds.minY <= 0 && bounds.maxY >= 0) {
            var yRatio = (0 - bounds.minY) / rangeY;
            var svgY = height - (yRatio * height);
            var yValue = svgY.toFixed(2);
            this.elements.axisX.setAttribute('y1', yValue);
            this.elements.axisX.setAttribute('y2', yValue);
            this.elements.axisX.setAttribute('visibility', 'visible');
        } else {
            this.elements.axisX.setAttribute('visibility', 'hidden');
        }

        if (domainStart <= 0 && domainEnd >= 0) {
            var xRatio = (0 - domainStart) / domainRange;
            var svgX = xRatio * width;
            var xValue = svgX.toFixed(2);
            this.elements.axisY.setAttribute('x1', xValue);
            this.elements.axisY.setAttribute('x2', xValue);
            this.elements.axisY.setAttribute('visibility', 'visible');
        } else {
            this.elements.axisY.setAttribute('visibility', 'hidden');
        }
    };

    Calculator.prototype.clearGraph = function() {
        this.elements.graphLine.setAttribute('d', '');
        this.elements.axisX.setAttribute('visibility', 'hidden');
        this.elements.axisY.setAttribute('visibility', 'hidden');
        this.hideResult();
    };

    Calculator.prototype.showError = function(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('d-none');
        this.hideResult();
    };

    Calculator.prototype.hideResult = function() {
        this.elements.result.textContent = '';
        this.elements.result.classList.add('d-none');
    };

    Calculator.prototype.showResult = function(valueAt, result) {
        var self = this;
        if (!isFinite(result)) {
            this.showError(this.strings.evaluation);
            return;
        }

        this.elements.error.classList.add('d-none');
        this.renderNonce += 1;
        var currentNonce = this.renderNonce;

        Str.get_string('result:value', 'block_graphcalc', {
            x: formatNumber(valueAt),
            y: formatNumber(result)
        }).then(function(text) {
            if (currentNonce !== self.renderNonce) {
                return;
            }
            self.elements.result.textContent = text;
            self.elements.result.classList.remove('d-none');
        }).catch(function() {
            var fallback = self.strings.resultTemplate
                .replace('{x}', formatNumber(valueAt))
                .replace('{y}', formatNumber(result));
            self.elements.result.textContent = fallback;
            self.elements.result.classList.remove('d-none');
        });
    };

    Calculator.init = function(root, config) {
        return new Calculator(root, config);
    };

    return Calculator;
});
