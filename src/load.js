import { log,warn,err } from './log.js'

const uuid = "orbital/sys/load"

const description = `Load component loads other assets on demand`

const resolve = async function(blob,sys) {

	//
	// handle candidates in a variety of ways
	//

	if(!blob || !blob.load) return

	let candidates = []
	if(Array.isArray(blob.load)) {
		candidates = blob.load
	} else if(typeof blob.load === 'string' || blob.load instanceof String) {
		candidates = [blob.load]
	} else {
		err(uuid,'unsupported type',blob)
		return
	}

	//
	// build a list of found artifacts by scanning the candidate files
	//

	const found = []

	for(let candidate of candidates) {

		// try divine the real location of the resource
		const resource = harmonize_resource_path(this,blob,candidate)
		if(!resource) {
			continue
		}

		// only visit a file once ever
		if(!this._visited) this._visited = {}
		if(this._visited[resource]) {
			warn(uuid,' - already attempted to load once',resource)
			continue
		}
		this._visited[resource] = resource

		// mark found objects with the resource path - dealing with returned array collections
		const inject_metadata = (key,item) => {
			if(!item) {
				err(uuid,'corrupt exports',key)
			} else if(Array.isArray(null,item)) {
				item.forEach( inject_metadata )
			} else if(typeof item === 'object') {
				item._metadata = { key, anchor:resource }
			}
		}

		//
		// fetch the file and then visit all found objects
		//
		// there are a few hiccups and questions to ponder:
		// 
		// @todo arguably could grant uuid ... this may need thought since clearly keys can trivially collide
		// if(!item.uuid) item.uuid = key
		//
		// @todo there is a case where i want to speculatively peek at folders; I can't seem to do it without an error
		// await fetch(resource, { method: 'HEAD' }) <- would like to avoid throwing an error...
		//
		// @todo there's also a concern about a resolver being added while in the middle of digesting data
		// if a resolver is added to the chain too early then it can witness its own load packet fly past...
		// unsure if that is really a problem - sys.resolve() specifically prevents this - see unadulterated
		//
		// @todo there's a case where we want to have a single entity do a load and then some work
		// for example {load,dosomework} where the loader may have loaded a resolver
		// right now the dosomework packet will not be seen by loaded resolvers in that round
		// a work-around would be to have this loader call sys._resolve_one(loaded-object)
		// conceptually it maps to an idea of the system being built in order
		// but it is risky in that services appear sooner than may be expected... but we will try for now
		//

		try {
			const module = await import(resource)
			for(const [k,v] of Object.entries(module)) {
				inject_metadata(k,v)
				//found.push(v)
				sys._resolve_one(v)
			}

		} catch(e) {
			err(uuid,'unable to load',e)
		}
	}

	// force inject these before anything else that the queue runs - because users expect sequential state
	if(found.length) {
		sys._force_inject(found)
	}
}

//
// manifest load helper
//
// intercept entities with a { load: [] } field
// immediately import requested assets
// entities that are found as exports in files are treated as inputs to sys
// these entities are force injected into sys sequentially - ahead of anything else that is stacked up - for principle of least surprise
//

const loader_helper = {
	uuid,
	description,
	resolve,
}

export default loader_helper

/////////////////////////////////////////////////////////////////////////////////////////////////////////
///
/// harmonization of paths
///
/// there are some challenges in resolving imports
///
///		- users may indicate an absolute resource such as 'https://something.com/something.js'
///		- it's convenient for users to indicate relative paths such as ./myasset.js or ../myasset.js
///		- and also users may want to indicate paths associated with import maps such as 'orbital/something.js'
///		- users may wish to specify '/someasset' - although that breaks path relative apps - but should be supported
///		- users may wish to even compose paths out in a way that looks like /someasset/thing.js/../otherthing.js'
///		- because this loader itself may come from jsdelivr or somewhere, its own import.meta.url is not useful
///		- a user could supply an 'anchor' to ground any relative requests however
///		- import maps as a whole are badly designed conceptually
///		- import maps cannot be altered late; and cannot be rewritten or browsed
///		- import maps don't work on servers, creating an inconsistent behavior
///		- on a server the cwd does imply the root of the server operation and we want to prevent escaping that frame
///
/////////////////////////////////////////////////////////////////////////////////////////////////////////

const isServer = (typeof window === 'undefined') ? true : false
const cwd = (typeof process === 'undefined') ? "" : process.cwd()

export const harmonize_resource_path = (scope,blob,resource) => {

	// @todo this could be made configurable dynamically
	if(!scope._config) {
		scope._config = {
			index:'index.js',
			importmaps: {
			},
			root:null
		}
	}
	const config = scope._config

	// disallow unrecognized or too short
	if (!resource || typeof resource !== 'string' && !(resource instanceof String) || resource.length < 1) {
		return null
	}

	// disallow supporting /filename for now completely
	if(resource[0]=='/') {
		err(uuid,'not portable to start a resource at an absolute path',resource)
		return null
	}

	// allow importing of urls as is
	const lower = resource.toLowerCase()
	if( lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://') ) {
		return resource
	}

	// callers will almost always want to supply an anchor
	let anchor = blob.anchor || null

	// a blob load may be indirect and may have populated metadata hints for an anchor
	if(!anchor && blob._metadata && blob._metadata.anchor) {
		anchor = blob._metadata.anchor
	}

	// non relative files are import maps - the anchor must be ignored - import() is responsible for these
	if(resource[0]!='.') {
		return resource
	}

	// composit the file and the anchor - URL will strip "../../" and generate a canonical path
	if(!isServer) {
		const url = new URL(resource,anchor)
		return url
	}

	// server with anchor - no safety checks @todo
	return anchor + resource.substring(1)

}

