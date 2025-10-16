<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

defined('MOODLE_INTERNAL') || die();

$string['pluginname'] = 'Graphing calculator';
$string['graphcalc:addinstance'] = 'Add a new graphing calculator block';
$string['graphcalc:myaddinstance'] = 'Add a new graphing calculator block to the My Moodle page';
$string['graphcalc:view'] = 'View the graphing calculator block';
$string['privacy:metadata'] = 'The graphing calculator block does not store personal data.';
$string['label:expression'] = 'Expression f(x)';
$string['label:domainstart'] = 'Domain start';
$string['label:domainend'] = 'Domain end';
$string['label:samples'] = 'Sample points';
$string['label:valueat'] = 'Evaluate at x =';
$string['result:heading'] = 'Result';
$string['result:value'] = 'f({$a->x}) = {$a->y}';
$string['result:graphheading'] = 'Graph preview';
$string['error:emptyexpression'] = 'Enter an expression in terms of x (for example: x^2 + 3).';
$string['error:invalidexpression'] = 'The expression can only contain numbers, x, parentheses, spaces, and + - * / ^ operators.';
$string['error:domain'] = 'The domain start must be less than the domain end.';
$string['error:evaluation'] = 'Unable to evaluate the expression for at least one sampled x value.';
$string['hint:expression'] = 'Use x to plot the function. Supported operators: +, -, *, /, ^, parentheses.';
$string['placeholder'] = 'Enter an expression to view the graph and quick evaluation.';
$string['config:allowadvanced'] = 'Enable advanced graphing features';
$string['config:allowadvanced_desc'] = 'Toggle access to additional graphing options such as range presets and function history.';
$string['usage:course'] = 'Add this block from the activity chooser while editing a course page to provide learners with an inline calculator.';
$string['usage:quiz'] = 'Enable "Display on page types" → "Any page" in block settings to surface the calculator during quiz attempts.';
$string['privacy:metadata:description'] = 'The graphing calculator block evaluates expressions in the browser and does not persist calculation data.';
