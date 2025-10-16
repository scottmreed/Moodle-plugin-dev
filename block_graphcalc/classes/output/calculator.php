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

use renderable;
use templatable;
use renderer_base;

/**
 * Renderable representing the graphing calculator block content.
 *
 * @package   block_graphcalc
 */
class calculator implements renderable, templatable {
    /** @var string Unique DOM id for the calculator container. */
    private string $calculatorid;

    /** @var bool Whether advanced controls are enabled. */
    private bool $allowadvanced;

    /**
     * @param string $calculatorid
     * @param bool $allowadvanced
     */
    public function __construct(string $calculatorid, bool $allowadvanced) {
        $this->calculatorid = $calculatorid;
        $this->allowadvanced = $allowadvanced;
    }

    /**
     * Export template data.
     *
     * @param renderer_base $output
     * @return array
     */
    public function export_for_template(renderer_base $output): array {
        return [
            'title' => get_string('pluginname', 'block_graphcalc'),
            'calculatorid' => $this->calculatorid,
            'allowadvanced' => $this->allowadvanced,
        ];
    }
}
