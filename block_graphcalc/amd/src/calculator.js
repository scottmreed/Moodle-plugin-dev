// SPDX-License-Identifier: GPL-3.0-or-later
// Graphing calculator component.

import Str from 'core/str';

const SELECTORS = {
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
    AXIS_Y: '[data-region="axis-y"]',
};

const GRAPH_DIMENSIONS = {
    width: 400,
    height: 240,
};

const DEFAULTS = {
    domainStart: -10,
    domainEnd: 10,
    samples: 50,
    valueAt: 0,
};

const ALLOWED_EXPRESSION = /^[0-9xX+\-*/^().\s]+$/;

const LANGUAGE_KEYS = [
    {key: 'error:emptyexpression', component: 'block_graphcalc'},
    {key: 'error:invalidexpression', component: 'block_graphcalc'},
    {key: 'error:domain', component: 'block_graphcalc'},
    {key: 'error:evaluation', component: 'block_graphcalc'},
    {key: 'result:value', component: 'block_graphcalc', param: {x: '{x}', y: '{y}'}},
];

/**
 * Format numbers for display to avoid long decimal strings.
 *
 * @param {number} value
 * @returns {string}
 */
const formatNumber = (value) => {
    if (!Number.isFinite(value)) {
        return 'NaN';
    }
    if (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-4) {
        return value.toExponential(4);
    }
    return Number(value.toFixed(6)).toString();
};

/**
 * Graphing calculator controller.
 */
class Calculator {
    /**
     * @param {HTMLElement} root
     * @param {Object} config
     */
    constructor(root, config = {}) {
        if (!root) {
            throw new Error('Graphing calculator root element is required.');
        }

        this.root = root;
        this.config = config;
        this.state = {
            expression: '',
            domainStart: DEFAULTS.domainStart,
            domainEnd: DEFAULTS.domainEnd,
            samples: DEFAULTS.samples,
            valueAt: DEFAULTS.valueAt,
            evaluator: null,
        };
        this.renderNonce = 0;

        this.strings = {
            emptyExpression: 'Enter an expression in terms of x (for example: x^2 + 3).',
            invalidExpression: 'The expression can only contain numbers, x, parentheses, spaces, and + - * / ^ operators.',
            domain: 'The domain start must be less than the domain end.',
            evaluation: 'Unable to evaluate the expression for at least one sampled x value.',
            resultTemplate: 'f({x}) = {y}',
        };

        this.cacheElements();
        this.bindEvents();
        this.initialiseFromInputs();
        this.loadStrings();
        this.refresh();
    }

    /**
     * Lookup required DOM elements.
     */
    cacheElements() {
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
            axisY: this.root.querySelector(SELECTORS.AXIS_Y),
        };

        Object.entries(this.elements).forEach(([key, element]) => {
            if (!element) {
                throw new Error(`Missing graph calculator element for ${key}`);
            }
        });
    }

    /**
     * Bind DOM events to update state.
     */
    bindEvents() {
        this.elements.expression.addEventListener('input', (event) => {
            this.setState({expression: event.target.value});
        });
        this.elements.domainStart.addEventListener('change', (event) => {
            this.setState({domainStart: this.parseNumber(event.target.value, this.state.domainStart)});
        });
        this.elements.domainEnd.addEventListener('change', (event) => {
            this.setState({domainEnd: this.parseNumber(event.target.value, this.state.domainEnd)});
        });
        this.elements.samples.addEventListener('change', (event) => {
            this.setState({samples: this.parseSamples(event.target.value)});
        });
        this.elements.valueAt.addEventListener('input', (event) => {
            this.setState({valueAt: this.parseNumber(event.target.value, this.state.valueAt)});
        });
    }

    /**
     * Initialise state from default input values.
     */
    initialiseFromInputs() {
        this.state.expression = this.elements.expression.value || '';
        this.state.domainStart = this.parseNumber(this.elements.domainStart.value, DEFAULTS.domainStart);
        this.state.domainEnd = this.parseNumber(this.elements.domainEnd.value, DEFAULTS.domainEnd);
        this.state.samples = this.parseSamples(this.elements.samples.value);
        this.state.valueAt = this.parseNumber(this.elements.valueAt.value, DEFAULTS.valueAt);
    }

    /**
     * Fetch localised strings and override the English fallbacks.
     */
    loadStrings() {
        Str.get_strings(LANGUAGE_KEYS).then((results) => {
            this.strings.emptyExpression = results[0];
            this.strings.invalidExpression = results[1];
            this.strings.domain = results[2];
            this.strings.evaluation = results[3];
            this.strings.resultTemplate = results[4];
            this.refresh();
        }).catch(() => {
            // eslint-disable-next-line no-console
            console.warn('block_graphcalc: Failed to load language strings, using defaults.');
        });
    }

    /**
     * Parse numeric input.
     *
     * @param {string} value
     * @param {number} fallback
     * @returns {number}
     */
    parseNumber(value, fallback) {
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    /**
     * Parse samples select value.
     *
     * @param {string} value
     * @returns {number}
     */
    parseSamples(value) {
        const parsed = parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed < 10) {
            return DEFAULTS.samples;
        }
        return Math.min(parsed, 200);
    }

    /**
     * Merge partial state updates then re-render.
     *
     * @param {Object} patch
     */
    setState(patch) {
        this.state = {
            ...this.state,
            ...patch,
        };
        this.refresh();
    }

    /**
     * Compute and render the calculator output.
     */
    refresh() {
        const expression = this.state.expression.trim();
        if (!expression.length) {
            this.showError(this.strings.emptyExpression);
            this.clearGraph();
            return;
        }

        const sanitized = this.sanitizeExpression(expression);
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

        const evaluator = this.createEvaluator(sanitized.expression);
        if (!evaluator.ok) {
            this.showError(this.strings.invalidExpression);
            this.clearGraph();
            return;
        }
        this.state.evaluator = evaluator.fn;

        const sampling = this.samplePoints(this.state.evaluator, this.state.domainStart, this.state.domainEnd, this.state.samples);
        if (!sampling.ok) {
            this.showError(this.strings.evaluation);
            this.clearGraph();
            return;
        }

        this.drawGraph(sampling.points, sampling.bounds);
        this.showResult(this.state.valueAt, this.evaluateAt(this.state.evaluator, this.state.valueAt));
    }

    /**
     * Validate and normalise the expression.
     *
     * @param {string} expression
     * @returns {{ok: boolean, expression?: string}}
     */
    sanitizeExpression(expression) {
        if (!ALLOWED_EXPRESSION.test(expression)) {
            return {ok: false};
        }
        const converted = expression.replace(/X/g, 'x').replace(/\^/g, '**');
        return {ok: true, expression: converted};
    }

    /**
     * Build a callable evaluator function.
     *
     * @param {string} expression
     * @returns {{ok: boolean, fn?: Function}}
     */
    createEvaluator(expression) {
        try {
            // eslint-disable-next-line no-new-func
            const fn = new Function('x', `'use strict'; return (${expression});`);
            // Simple probe to ensure the function is valid.
            const probe = fn(0);
            if (typeof probe === 'undefined') {
                return {ok: false};
            }
            return {ok: true, fn};
        } catch (error) {
            return {ok: false};
        }
    }

    /**
     * Evaluate the function for a specific x value.
     *
     * @param {Function} fn
     * @param {number} x
     * @returns {number}
     */
    evaluateAt(fn, x) {
        try {
            const value = fn(x);
            if (!Number.isFinite(value)) {
                throw new Error('Non-finite result');
            }
            return value;
        } catch (error) {
            return NaN;
        }
    }

    /**
     * Sample a set of points across the domain.
     *
     * @param {Function} fn
     * @param {number} domainStart
     * @param {number} domainEnd
     * @param {number} samples
     * @returns {{ok: boolean, points?: Array, bounds?: {minY: number, maxY: number}}}
     */
    samplePoints(fn, domainStart, domainEnd, samples) {
        const points = [];
        const step = (domainEnd - domainStart) / Math.max(samples - 1, 1);
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        for (let index = 0; index < samples; index++) {
            const x = domainStart + (step * index);
            const y = this.evaluateAt(fn, x);
            if (!Number.isFinite(y)) {
                continue;
            }
            points.push({x, y});
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        if (!points.length || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
            return {ok: false};
        }

        if (minY === maxY) {
            const padding = Math.max(1, Math.abs(minY) * 0.5);
            minY -= padding;
            maxY += padding;
        }

        return {
            ok: true,
            points,
            bounds: {minY, maxY},
        };
    }

    /**
     * Draw the sampled points into the SVG.
     *
     * @param {Array<{x: number, y: number}>} points
     * @param {{minY: number, maxY: number}} bounds
     */
    drawGraph(points, bounds) {
        const width = GRAPH_DIMENSIONS.width;
        const height = GRAPH_DIMENSIONS.height;
        const domainStart = this.state.domainStart;
        const domainRange = this.state.domainEnd - this.state.domainStart;
        const rangeY = bounds.maxY - bounds.minY;

        const commands = points.map((point, index) => {
            const xRatio = (point.x - domainStart) / domainRange;
            const yRatio = (point.y - bounds.minY) / rangeY;
            const svgX = xRatio * width;
            const svgY = height - (yRatio * height);
            const prefix = index === 0 ? 'M' : 'L';
            return `${prefix}${svgX.toFixed(2)} ${svgY.toFixed(2)}`;
        });

        this.elements.graphLine.setAttribute('d', commands.join(' '));

        this.updateAxis(bounds);
    }

    /**
     * Update axis positions for the current graph range.
     *
     * @param {{minY: number, maxY: number}} bounds
     */
    updateAxis(bounds) {
        const width = GRAPH_DIMENSIONS.width;
        const height = GRAPH_DIMENSIONS.height;
        const domainStart = this.state.domainStart;
        const domainEnd = this.state.domainEnd;
        const domainRange = domainEnd - domainStart;
        const rangeY = bounds.maxY - bounds.minY;

        // Horizontal axis (y = 0).
        if (bounds.minY <= 0 && bounds.maxY >= 0) {
            const yRatio = (0 - bounds.minY) / rangeY;
            const svgY = height - (yRatio * height);
            this.elements.axisX.setAttribute('y1', svgY.toFixed(2));
            this.elements.axisX.setAttribute('y2', svgY.toFixed(2));
            this.elements.axisX.setAttribute('visibility', 'visible');
        } else {
            this.elements.axisX.setAttribute('visibility', 'hidden');
        }

        // Vertical axis (x = 0).
        if (domainStart <= 0 && domainEnd >= 0) {
            const xRatio = (0 - domainStart) / domainRange;
            const svgX = xRatio * width;
            this.elements.axisY.setAttribute('x1', svgX.toFixed(2));
            this.elements.axisY.setAttribute('x2', svgX.toFixed(2));
            this.elements.axisY.setAttribute('visibility', 'visible');
        } else {
            this.elements.axisY.setAttribute('visibility', 'hidden');
        }
    }

    /**
     * Hide graph elements.
     */
    clearGraph() {
        this.elements.graphLine.setAttribute('d', '');
        this.elements.axisX.setAttribute('visibility', 'hidden');
        this.elements.axisY.setAttribute('visibility', 'hidden');
        this.hideResult();
    }

    /**
     * Show an error message.
     *
     * @param {string} message
     */
    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('d-none');
        this.hideResult();
    }

    /**
     * Hide the error alert.
     */
    hideError() {
        this.elements.error.textContent = '';
        this.elements.error.classList.add('d-none');
    }

    /**
     * Display the result string.
     *
     * @param {number} valueAt
     * @param {number} result
     */
    showResult(valueAt, result) {
        if (!Number.isFinite(result)) {
            this.showError(this.strings.evaluation);
            return;
        }

        this.hideError();
        const formatted = this.strings.resultTemplate
            .replace('{x}', formatNumber(valueAt))
            .replace('{y}', formatNumber(result));

        this.renderNonce += 1;
        const nonce = this.renderNonce;

        Str.get_string('result:value', 'block_graphcalc', {
            x: formatNumber(valueAt),
            y: formatNumber(result),
        }).then((text) => {
            if (nonce !== this.renderNonce) {
                return;
            }
            this.elements.result.textContent = text;
            this.elements.result.classList.remove('d-none');
        }).catch(() => {
            this.elements.result.textContent = formatted;
            this.elements.result.classList.remove('d-none');
        });
    }

    /**
     * Hide the result alert.
     */
    hideResult() {
        this.elements.result.textContent = '';
        this.elements.result.classList.add('d-none');
    }

    /**
     * Factory entry point used by Mustache initialisers.
     *
     * @param {HTMLElement} root
     * @param {Object} config
     * @returns {Calculator}
     */
    static init(root, config = {}) {
        return new Calculator(root, config);
    }
}

export default Calculator;
