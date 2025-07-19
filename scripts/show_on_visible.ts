

const intersectionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (entry.target.classList.contains("ros") && entry.intersectionRatio > 0.4) {
            entry.target.classList.add("visible");
        }
    }
}, {
    threshold: 0.4
});

const mutationObserver = new MutationObserver((mutations, observer) => {

    for (const mutation of mutations) {
        if (mutation.type == "childList") {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType == Node.ELEMENT_NODE) {
                    intersectionObserver.observe(node as Element);
                }
            });

            mutation.removedNodes.forEach(node => {
                if (node.nodeType == Node.ELEMENT_NODE) {
                    intersectionObserver.unobserve(node as Element);
                }
            });
        }
    }
});


document.querySelectorAll(".ros").forEach(intersectionObserver.observe.bind(intersectionObserver));