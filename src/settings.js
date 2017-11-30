import {object_subset} from './utils'


function check_keys(keys) {
	if (keys === undefined) return
	const wrong_keys = keys.filter(k => ! k in defaults)
	const plurality = wrong_keys.length > 1 ? 's' : ''
	if (wrong_keys.length > 0)
		throw new Exception(`Unknown setting${plurality} “${wrong_keys.join('”, “')}”. Available settings: ${Object.keys(defaults)}`)
}


export const defaults = {
	delay: '02:00',
	counter: true,
	notify: false,
	dehash: false,
}

export async function get(keys) {
	check_keys(keys)
	const opts = await browser.storage.local.get(keys)
	return Object.assign({}, object_subset(defaults, keys), opts)
}

export async function set(opts) {
	check_keys(Object.keys(opts))
	await browser.storage.local.set(opts)
}

export async function get_one(key) {
	const opts = await get([key])
	return opts[key]
}

export async function set_one(key, value) {
	await set({ [key]: value })
}
