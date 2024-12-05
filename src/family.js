//
// An observer that helps tidy up parent child relationships
// This helper is a 'nice to have' - not actually critical
//
// @todo note children are not individually marked as 'obliterate' ...
//

const resolve = (blob,sys) => {

	if(blob.obliterate && blob.parent && blob.parent.children) {
		blob.parent.children = blob.parent.children.filter(item => item.id !== blob.id)
	}

	else if(blob.parent) {
		if(!blob.parent.children) blob.parent.children = []
		const found = blob.parent.children.find((item) => item === blob)
		if(!found) {
			blob.parent.children.push(blob)
		}
	}
}

resolve.filter = { family: true }

export default {
	resolve,
	uuid: "orbital/sys/family",
	description: "An early resolver in the pipeline tidy up parent child concepts",
)
