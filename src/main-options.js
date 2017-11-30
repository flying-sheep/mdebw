import * as settings from './settings'


//Web API helpers

const input_fields = {
	checkbox: 'checked',
	number:   'valueAsNumber',
	text:     'value',
}
const input_get = input => input[input_fields[input.type]]
const input_set = (input, value) => input[input_fields[input.type]] = value

//Meat

function get_inputs() {
	return Array.from(document.body.querySelectorAll('input'))
}

async function save_option(input) {
	await settings.set_one(input.id, input_get(input))
}

async function restore_options() {
	const options = await settings.get()
	const mapped_inputs = get_inputs()
		.filter(i => i.id in options)
	
	for (const input of mapped_inputs) {
		input_set(input, options[input.id])
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	await restore_options()
	for (const input of get_inputs()) {
		input.addEventListener('change', () => save_option(input))
	}
})
