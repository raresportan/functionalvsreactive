'use strict';

(function () {

    /**
     * Reads the current URL (hash) and navigates accordingly.
     */
    const readURL = () => {
        const hash = window.location.hash; // e.g. #/7/1
        const bits = hash.slice(2).split('/');
        return (parseInt(bits[0], 10) - 1) || 0;
    }

    /**
     * Updates the page URL (hash) to reflect the current state.
     */
    const writeURL = slideIndex => {
        if (slideIndex !== undefined) window.location.hash = '/' + (slideIndex + 1);
    }


    /**
     * Returns a function that given and index, loads the lesson from that index,
     * that is it updates the UI elements.
     * 
     * Note that this function expects certain element ids to be present 
     * 
     * @param {r} lessons 
     */
    const findLesson = lessons => index => {
        const slideEl = document.getElementById('slide');
        const editorEl = document.getElementById('editor');
        const lessonTitle = document.getElementById("lessonTitle");
        const lessonSubtitle = document.getElementById("lessonSubtitle");

        // show code editor only if slide is code
        if (lessons[index].type === 'code') {
            slideEl.style.display = 'none';
            editorEl.style.display = 'flex';
            editor.gotoLine(1);
            editor.setValue(lessons[index].code, 1);
        } else {
            editorEl.style.display = 'none';
            slideEl.style.display = 'flex';
            slideEl.innerHTML = lessons[index].code;
        }

        lessonTitle.innerHTML = lessons[index].title;
        if (lessons[index].subtitle) {
            lessonSubtitle.innerHTML = lessons[index].subtitle;
            lessonSubtitle.style['display'] = 'initial';
        } else {
            lessonSubtitle.style['display'] = 'none';
        }
    }


    const init = () => {
        const lessonNodes = document.querySelectorAll(".lesson");
        const lessonsArray = Array.prototype.slice.call(lessonNodes);
        const lessons = lessonsArray.map(aLessonNode => {
            return {
                type: aLessonNode.tagName.toUpperCase() === 'PRE' ? 'code' : 'slide',
                code: aLessonNode.tagName.toUpperCase() === 'PRE' ? aLessonNode.innerText : aLessonNode.innerHTML,
                title: aLessonNode.getAttribute("data-title"),
                subtitle: aLessonNode.getAttribute("data-subtitle")
            }
        })
        let currentLesson = 0;
        const allLessons = lessons.length;
        const previousButton = document.getElementById('previousLesson');
        const nextButton = document.getElementById('nextLesson');

        const limit = (index, max) => Math.min(Math.max(0, index), max - 1);

        // need access to all lessons
        const renderLesson = findLesson(lessons, currentLesson);
        const hasNext = () => currentLesson < allLessons - 1;
        const hasPrevious = () => currentLesson > 0;

        // needs access to previous and next buttons
        const updateNavigation = currentLesson => {
            previousButton.disabled = !hasPrevious();
            nextButton.disabled = !hasNext();
            writeURL(currentLesson);
        }

        const next = () => {
            if (hasNext()) {
                currentLesson = limit(currentLesson + 1, allLessons);
                renderLesson(currentLesson)
                updateNavigation(currentLesson);
            }
        }
        nextButton.addEventListener('click', next);

        const previous = () => {
            if (hasPrevious()) {
                currentLesson = limit(currentLesson - 1, allLessons);
                renderLesson(currentLesson);
                updateNavigation(currentLesson);
            }
        }
        previousButton.addEventListener('click', previous);

        const showLessonFromHash = () => {
            currentLesson = readURL();
            currentLesson = limit(currentLesson, allLessons);
            renderLesson(currentLesson);
            updateNavigation(currentLesson);
        }
        showLessonFromHash();
        window.addEventListener('hashchange', showLessonFromHash, false);
    }
    window.addEventListener('load', init);
}())
