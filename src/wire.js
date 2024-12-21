
const uuid = 'orbital-sys-wire'

function resolve(blob) {

	if(blob.tick || blob.time) return

	if(blob.uuid) {
		this._entities[blob.uuid]=blob
		// @todo deal with obliteration and updates @todo probably need better sol
	}

	if(!blob.wire) return

	for(let i = 0;i<blob.wire.length;i+=4) {

		// objects by name or real object
		const src = blob.wire[i]
		const dest = blob.wire[i+2]

		// get real object
		let srcobj = src === 'object' ? src : this._entities[src]
		let destobj = dest === 'object' ? dest : this._entities[dest]

		// get binding point for source
		if(!srcobj) {
			console.error(uuid,'src not found',src)
			continue
		}
		let srcfun = blob.wire[i+1]
		let srcfunparts = srcfun.split('.')
		if(srcfunparts.length > 1) {
			srcobj = srcobj[ srcfunparts[0] ]
			srcfun = srcfunparts[1]
		}
		if(!srcobj) {
			console.error(uuid,'src not found',src)
			continue
		}

		// get binding point for dest
		if(!destobj) {
			console.error(uuid,'dest not found',dest)
			continue
		}
		let destfun = blob.wire[i+3]
		let destfunparts = destfun.split('.')
		if(destfunparts.length > 1) {
			destobj = destobj[ destfunparts[0] ]
			destfun = destfunparts[1]
		}
		if(!destobj) {
			console.error(uuid,'dest not found',dest)
			continue
		}
		destfun = destobj[ destfun ]
		if(!destfun) {
			console.error(uuid,'dest function not found',dest)
			continue
		}

		// a source is a placeholder function that will be rewritten to publish to multiple observers
		let targets = srcobj._targets || (srcobj._targets = [])
		srcobj[srcfun] = async function() {
			for(const target of targets) {
				await target(...arguments)
			}
		}
		srcobj[srcfun].targets = targets

		// register the new target - make sure to explicitly bind it to the target
		targets.push(destfun.bind(destobj))
	}
}

///
/// a test concept of formal hotwiring of methods between objects on demand; effectively late binding / linking
/// watches all entities and accumulates those with a uuid
/// @todo use a centralized db for entities
///

const helper = {
	uuid,
	_entities:{},
	resolve
}

export default helper
