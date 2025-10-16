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

namespace block_graphcalc\output;

use plugin_renderer_base;

/**
 * Renderer for graphing calculator block content.
 *
 * @package   block_graphcalc
 */
class renderer extends plugin_renderer_base {
    /**
     * Render the calculator block content.
     *
     * @param calculator $calculator
     * @return string
     */
    public function render_calculator(calculator $calculator): string {
        return $this->render_from_template('block_graphcalc/block', $calculator->export_for_template($this));
    }
}
