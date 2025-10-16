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

/**
 * Graphing calculator block definition.
 *
 * @package   block_graphcalc
 * @copyright 2024
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class block_graphcalc extends block_base {
    /**
     * Initialise the block title.
     */
    public function init(): void {
        $this->title = get_string('pluginname', 'block_graphcalc');
    }

    /**
     * Declare the block formats where this block may appear.
     *
     * @return array<string, bool>
     */
    public function applicable_formats(): array {
        return [
            'all' => true,
        ];
    }

    /**
     * Indicate block instances can be hidden.
     */
    public function instance_can_be_hidden(): bool {
        return true;
    }

    /**
     * Provide block content. The renderer and Mustache template are assigned later.
     */
    public function get_content(): stdClass {
        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();

        if (!has_capability('block/graphcalc:view', $this->context)) {
            $this->content->text = '';
            $this->content->footer = '';
            return $this->content;
        }

        $renderer = $this->page->get_renderer('block_graphcalc');
        $calculatorid = html_writer::random_id('block-graphcalc');
        $allowadvanced = (bool) get_config('block_graphcalc', 'allowadvanced');

        $renderable = new \block_graphcalc\output\calculator($calculatorid, $allowadvanced);
        $this->content->text = $renderer->render($renderable);
        $this->content->footer = '';

        return $this->content;
    }
}
