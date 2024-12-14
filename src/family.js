
const uuid = 'orbital/sys/family'

//
// exploring ideas around parent child relationships 
//

const resolve = (blob,sys) => {

	// remove obliterated child
	// @todo that children are not marked individually for obliterate - this needs refining
	if(blob.obliterate && blob.parent && blob.parent.children) {
		blob.parent.children = blob.parent.children.filter(item => item.id !== blob.id)
		return
	}

	// if a parent is specified make sure that the parent has the child in it
	// @todo debatable if this is a good way to register children - it breaks a datagram concept - should use uuid
	// @todo parent child relationships should probably be like any other relationship - managed by sys
	if(blob.parent) {
		if(!blob.parent.children) blob.parent.children = []
		const found = blob.parent.children.find((item) => item === blob)
		if(!found) {
			blob.parent.children.push(blob)
		}
	}
}

resolve.filter = { family: true }

export default {
	uuid,
	resolve,
	description: "An early resolver in the pipeline tidy up parent child concepts",
)
