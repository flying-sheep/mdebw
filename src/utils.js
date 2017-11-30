export function identity(x) { return x }

export function make_object(iterable, keyfunc, elemfunc=identity) {
	const object = {}
	for (const element of iterable) {
		object[keyfunc(element)] = elemfunc(element)
	}
	return object
}

export function object_subset(obj, keys=Object.keys(obj)) {
	return make_object(keys, identity, k => obj[k])
}
