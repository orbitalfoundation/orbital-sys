

const patched = []

const filters = [ { outs:[] } ]

function filter_find(key,value) {

	// given the value look for a value.filter
	// if there is no value.filter then maybe setup an interceptor that waits for the first out, and binds then...
	// return a catch all or a more specific filter
	// set filter.outs = [] if new

// @todo refine if filters are exclusive or inclusive
// for example a simple filter may be { quality1: {}, quality2: {} } meaning either or both
// or it may mean both - i need to formalize what i want for filters

	const filter = filter[0]

	if(!filter.outs) filter.outs = []

	// call the matching observers
	filter.out_helper = () => {
		for(const out of filter.outs) {
			out(...arguments)
		}
	}

	return filter
}


// when an entity enters sys once (by registration) we wire it up
function resolve(entity) {

	// visit an entity once only since they probably won't change
	if(patched[entity]) return
	patched[entity] = true

	// look for naked functions at the top level for now

	// @todo the key is actually value.name so we can just iterate object.values
	for (const [key, value] of Object.entries(entity)) {
		if (typeof value !== 'function') continue

		// find or create a matching filter for the method (in or out)
		const filter = filter_find(key,value)

		// methods that are 'outs' become rewritten to become an observer pattern
		if (key.endsWith("_out")) {
			entity[key] = filter.out_helper
		}

		// remaining methods are 'ins'
		else {
			filter.outs.push(value)
		}

	}

}

///
/// right now resolve() is very sloppy - it would be better to hardwire the routes with observers
///
/// experimental self annealing routes between entities
/// @todo turned off for now - still thinking about this - dec 2024
///

//export const anneal_resolver = { resolve }



