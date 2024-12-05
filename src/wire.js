
function resolve(blob) {

	if(blob.uuid) {
		this.entities[blob.uuid]=blob
		// @todo deal with obliteration
	}

	if(!blob.wire) return

	for(let i = 0;i<blob.wire.length;i+=4) {

		// a wire consists of four elements, a source, a source function, a target, a target function
		const src = blob.wire[i]
		const srcfun = blob.wire[i+1]
		const dest = blob.wire[i+2]
		const destfun = blob.wire[i+3]

		// a caller can pass live handles on a real object
		const srcobj = src === 'object' ? src : this.entities[src]
		const destcobj = dest === 'object' ? dest : this.entities[dest]

		// a local cache is kept of objects that were witnessed - @todo a common entity database may be used later
		if(!srcobj) {
			console.error(uuid,'src not found',src)
			continue
		}
		if(!destobj) {
			console.error(uuid,'dest not found',dest)
			continue
		}

		// a source is a placeholder function that will be rewritten to publish to multiple observers
		let targets = srcobj[srcfun] && srcobj[srcfun].targets ? srcobj[srcfun].targets : []
		srcobj[srcfun] = async function(args) {
			targets.forEach(target => { target(...arguments) } )
		}
		srcobj[srcfun].targets = targets

		// register the new target - make sure to explicitly bind it to the target
		targets.push(destfun.bind(dest))
	}
}

///
/// a test concept of formal hotwiring of methods between objects on demand; effectively late binding / linking
/// watches all entities and accumulates those with a uuid
///

export default {
	entities:{},
	resolve
}

/*

also can support behave graph style layouts - dec 2024:

// example of moving or adjusting an existing instance - could be found by a name or query also arguably or tacked onto an object itself
export const place = {
	wire: [{
		kind: 'placement',
		subject: { resource: '*llm' },
		position: [0,0,0],
	}]
}

// example of a flow wire of execution - participants could be found by a name or query also
export const layout = {
	wire: [{
		kind: 'wire',
		subject: llm,
		fn1: llm.text_out,
		target: tts,
		fn2: tts.text_in,
	}]
}

// example of a simple value being set on something as a visual relation
export const setter = {
	wire: {
		kind: 'value',
		position: [10,0,0],
		subject: tts,
		name: 'velocity',
		value: [0,0,0]
	}
}


*/






