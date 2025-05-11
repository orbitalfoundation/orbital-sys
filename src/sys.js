
import { log,warn,err } from './log.js'

import resolver_resolver from './resolve.js'
import obliterate_resolver from './obliterate.js'
import schema_resolver from './schema.js'
//import { family_resolver } from './family.js'
import load_resolver from './load.js'
import wire_resolver from './wire.js'
import tick_resolver from './tick.js'

const isServer = (typeof window === 'undefined') ? true : false

if(isServer) {
	await import('./server-log.js')
}

//
// simple optional filters as a way to reduce traffic
// @todo this current brute force way of matching on every packet is pretty sloppy
// right now filters are objects - may generalize
// may also allow filter functions since will switch to a memoized observer index (see flow.js)
// a filter is inclusive - so { first: true, second: true } matches either
//

const filter_match = (blob,resolver) => {
	if(!resolver.resolve.filter) return true
	for( const [k,v] of Object.entries(resolver.resolve.filter)) {
		if(!blob.hasOwnProperty(k)) return false
	}
	return true
}

//
// force inject something onto the queue so it is run at a specific time
// this is for the load helper because users have an expectation of sequentiality in manifests
// @todo may want to revisit this concept
//

const _force_inject = function (addme,offset=1) {
	const queue = this._queue
	if (queue.length >= offset) {
	    queue.splice(offset, 0, ...addme);
	} else {
	    queue.unshift(...addme);
	}
}

//
// handle global events sequentially to adhere to an 'event sourced' data driven pattern for user sanity
//
// resolve tackles one event at a time using await, and allows other events to pile up
// it detects if the queue is still being processed and just returns in that case
// right now there is no way of knowing if the queue is flushed @todo
//

const resolve = async function (args) {

	const queue = this._queue
	const busy = queue.length ? true : false
	queue.push(...arguments)
	if(busy) return

	while(queue.length) {
		await this._resolve_one(queue[0])
		queue.shift()
	}
}

//
// in a few cases, such as load() it is convenient to resolve one item right away
// but outside callers should not use this because these events are performed without respecting this._queue
//

const _resolve_one = async function (blob) {

	// build a mini queue because the actual blob itself could be a collection to resolve
	const queue = [blob]

	while(queue.length) {

		// get first element in queue; but leave in queue
		const blob = queue[0]

		// unroll arrays as a courtesy; rewrite in place - never modify the original blob
		if(Array.isArray(blob)) {
			queue.splice(0,1,...blob)
			continue
		}

		// sanity check
		else if(!blob) {
			err(`no data error`)
			queue.shift()
			continue
		}

		// sanity check
		else if(typeof blob === 'function') {
			warn(`functions not supported yet`,blob)
			queue.shift()
			continue
		}

		// sanity check
		else if( typeof blob !== 'object') {
			err(`must be an object for now`,blob)
			queue.shift()
			continue
		}

		// use a copy of the resolvers before calling; since objects can register new resolvers on the fly
		// @todo it is debatable if this idea of 'use a copy of resolvers' should be enforced; may be too strict
		const unadulterated = [ ...this._resolvers ]

		// visit each already registered resolver that was registered prior to the resolver chain being visited
		for(const resolver of this._resolvers) {
			// has a resolver?
			if(!resolver.resolve) continue
			// as a convenience function a resolver can be decorated with simple early filtering
			// @todo this is ghastly and 'orribly inefficient - please rewrite
			if(!filter_match(blob,resolver)) continue
			// perform calls synchronously at this level

			let results = await resolver.resolve(blob,sys,resolver)
			// to force abort the chain an explicit change must be returned with this reserved term
			if(results && results.force_abort_sys) break
			// arguably this could be explicitly set - but it can be implicitly set that is a bit safer
			// blob = results
		}

		queue.shift()

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
})

///
/// produceSys() allows for multiple instances of sys if desired
///
let counter = 1

export function produceSys() {

	// @todo the below resolvers need to be deep cloned to truly allow multiple separate copies of sys

	const internals = {

		// convenience
		isServer,

		// i'm encouraging a convention of having an id per entity
		uuid: `orbital/sys/sys-${counter++}`,

		// i'm encouraging a convention of having a description per entity
		description: 'orbital pubsub broker',

		// sys.resolve(args) is the pattern i'm using for all entities to handle messages
		resolve,
		_resolve_one,

		// reserve these fields in the entity namespace
		// note they are not actually reserved because sys itself predates the schema_resolver @todo
		schema: { uuid: true, force_abort_sys: true, resolve: true },

		// hack - allow forcing items into queue not at start
		_force_inject,

		// the sys queue itself; i encourage a pattern of using underbar for private state
		_queue: [],

		// the chain of resolvers - while this could be elsewhere it is convenient to have them here
		_resolvers: [
			load_resolver,
			resolver_resolver,
			//obliterate_resolver,
			//schema_resolver,
			//wire_resolver,
			tick_resolver // @todo toying with making this optional
		]
	}

	const sys = Object.assign( resolve.bind(internals), internals )

	return sys
}

///
/// a default instance of sys is available at globalThis.sys or 'sys' for other imports in the same context
///

export const sys = globalThis.sys = produceSys()

///
/// also sys is available as the default export
///

export default sys
