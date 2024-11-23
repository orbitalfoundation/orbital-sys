import { log,warn,err } from './log.js'

const uuid = "orbital/sys/load"

const description = `Load component loads other assets on demand`

const resolve = async function(blob,sys) {
	if(!blob.load) return

	//
	// load requested files
	// all exports are treated as raw inputs to sys.resolve - or basically messages
	// sys.resolve can digest objects (treated as an entity with components)
	// sys.resolve can also digest arrays, which may be more arrays or may be objects
	//

	const candidates = Array.isArray(blob.load) ? blob.load : [blob.load]
	for(let resource of candidates) {

		// divine the real location of the resource by magic
		resource = harmonize_resource_path(this,blob,resource)

		// only visit a file once ever
		if(!this._visited) this._visited = {}
		const visited = this._visited
		if(visited[resource]) {
			// warn(uuid,' - already attempted to load once',resource)
			continue
		}
		visited[resource] = true

		// fetch asset
		// @todo there is a case where i want to speculatively peek at folders; I can't seem to do it gracefully
		try {
			let exists = true //await fetch(resource, { method: 'HEAD' }) <- would like to avoid throwing an error...
			if(exists) {
				const module = await import(resource)
				for(const [k,v] of Object.entries(module)) {
					try {

						//log(uuid,'resolving',k,resource)
						const remember_resource_path = (item) => {
							if(!item) {
								err(uuid,'- error corrupt exports',k)
							} else if(Array.isArray(item)) {
								item.forEach( remember_resource_path )
							} else if(typeof item === 'object') {
								item._resource_path = resource
							}
						}

						// stuff resource path into found exports - @todo is this really useful? store that fact here instead?
						remember_resource_path(v)

						await sys.resolve(v)
					} catch(e) {
						err(uuid,' - error corrupt artifact key=',k,'content=',v,'error=',e)
					}
				}
			}
		} catch(e) {
			err(uuid,'- error unable to load',e)
		}
	}
}

export default {
	uuid,
	description,
	resolve,
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
// this could all use some work - @todo
/////////////////////////////////////////////////////////////////////////////////////////////////////////

const isServer = (typeof window === 'undefined') ? true : false
const cwd = (typeof process === 'undefined') ? "" : process.cwd()

export const harmonize_resource_path = (scope,blob,resource) => {

	// have default configuration
	if(!scope._config) {
		scope._config = {
			index:'index.js',
			importmaps: {
				'orbital':'orbital',
				'@':''
			},
			root:null
		}
	}
	const config = scope._config

	// ignore unrecognized
	if (!resource || typeof resource !== 'string' && !(resource instanceof String) || !resource.length) {
		return null
	}

	// ignore external
	const lower = resource.toLowerCase()
	if( lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://') ) {
		return resource
	}

	// conceptually work from a current folder path, allowing pushing and popping; disallowing bursting the root folder
	let out = []

	// split the path into pieces and analze each piece
	const parts = resource.split("/")
	for(let i = 0; i < parts.length; i++) {
		let part = parts[i]
		switch(part) {
			case '.':
				// @todo dunno what to do ... this looks like a "./myfile.js" ... ignore it i guess
				break
			case '..':
				// perform the .. right now - but prevent bursting or escaping the root folder on client and server
				out.pop()
				break
			case '':
				// on both server and client if the file ends in '/' then force inject a default manifest typically '/index.js'
				if(i == parts.length-1) {
					out.push(config.index)
				} else {
					// this appears to be a // or something not at the end of the path - illegal do nothing
				}
				break
			default:
				if(!i) {
					// inject a common root if any - this can be used when serving from weird subdirectories
					if(config.root) {
						out.push(config.root)
					}
					// may rewrite token or throw it away
					if(config.importmaps.hasOwnProperty(part)) {
						part = config.importmaps[part]
					}
				}
				if(part.length) {
					out.push(part)
				}
				break
		}
	}

	// if anchor try use it - this is a slight hack
	if(blob.anchor) {
		out.unshift( blob.anchor + "/..")
	}

	// otherwise if no anchor then assume is loading from root
	else {
		out.unshift( isServer ? cwd : '')
	}

	// stuff the slashes back in and turn into a string and return that
	const path = out.length ? out.join('/')  : null

	return path
}

