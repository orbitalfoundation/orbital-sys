
import { log,warn,err } from './log.js'

import resolver_resolver from './resolve.js'
import obliterate_resolver from './obliterate.js'
import schema_resolver from './schema.js'
//import { family_resolver } from './family.js'
import load_resolver from './load.js'
import tick_resolver from './tick.js'

const isServer = (typeof window === 'undefined') ? true : false

if(isServer) {
	await import('./server-log.js')
}

//
// simple optional filters as a way to reduce traffic
//

const filter_match = (blob,resolver) => {
	if(!resolver.resolve.filter) return true
	for( const [k,v] of Object.entries(resolver.resolve.filter)) {
		if(!blob.hasOwnProperty(k)) return false
	}
	return true
}


//
// handle events sequentially
//

const resolve = async function () {

	// if queue is busy then push work and return
	const queue = this._queue
	if(queue.length) {
		queue.push(...arguments)
		return
	}

	// resolve work
	queue.push(...arguments)
	while(queue.length) {

		// get first element in queue; but leave in queue
		const blob = queue[0]

		// unroll arrays as a courtesy; rewrite in place
		if(Array.isArray(blob)) {
			queue.splice(0,1,...blob)
			continue
		}

		// sanity check
		else if(!blob) {
			err(`no data error`)
			continue
		}

		// sanity check
		else if(typeof blob === 'function') {
			warn(`functions not supported yet`,blob)
			continue
		}

		// sanity check
		else if( typeof blob !== 'object') {
			err(`must be an object`,blob)
			continue
		}

		// use a copy of the resolvers before calling; since objects can register new resolvers on the fly
		const unadulterated = [ ...this._resolvers ]
		for(const resolver of unadulterated) {
			// has a resolver?
			if(!resolver.resolve) continue
			// as a convenience function a resolver can be decorated with simple early filtering
			if(!filter_match(blob,resolver)) continue
			// perform calls synchronously at this level
			let results = await resolver.resolve(blob,sys)
			// the blob can be modified in transit explicitly or implicitly
			if(!results) continue
			// to force abort the chain an explicit change must be returned with this reserved term
			if(results.force_abort_sys) break
			// arguably this could be explicitly set - but it can be implicitly set that is a bit safer
			// blob = results
		}

		// remove this element from queue
		queue.shift()

		// return blob when queue is empty as an indicator of completion
		if(!queue.length) return blob
	}
}

//
// exploring an idea of storing resolve prioritization onto the resolve function itself @experimental
// @todo note that these specific filters and schemas are not registered since they are declared before anything else
//

Object.assign(resolve,{
	before:"everything",
	after:null,
	filter:null,
	schema: { uuid: true, force_abort_sys: true }
})

///
/// produceSys() allows for multiple instances of sys if desired
///
let counter = 1

export function produceSys() {

	const sys = {

		// convenience
		isServer,

		// i'm encouraging an optional convention of having an id per entity
		uuid: `orbital/sys/sys-${counter++}`,

		// i'm encouraging an optional convention of having a description per entity
		description: 'orbital pubsub broker',

		// sys.resolve(args) is the pattern i'm using for all entities to handle messages
		resolve,

		// the sys queue itself; i encourage a pattern of using underbar for private state
		_queue: [],

		// the chain of resolvers - while this could be elsewhere it is convenient to have them here
		_resolvers: [
			resolver_resolver,
			obliterate_resolver,
			schema_resolver,
			load_resolver,
			tick_resolver
		]
	}

	return sys
}

///
/// a default instance of sys is available at globalThis.sys or 'sys' for other imports in the same context
///

const sys = globalThis.sys = produceSys()

///
/// sys can also be explicitly referenced
///

export default sys
