document.querySelectorAll('main nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const selectedSectionId = this.getAttribute('href').substring(1); 

        // Hide all sections
        document.getElementById('std_d').style.display = 'none';
        document.getElementById('std_t').style.display = 'none';
        document.getElementById('sup_d').style.display = 'none';
        document.getElementById('sup_t').style.display = 'none';

        // Show the selected section
        const selectedSection = document.getElementById(selectedSectionId);
        selectedSection.style.display = 'block';

        // Initialize buttons for the selected section
        initializeButtons(selectedSection);
    });
});

function initializeButtons(section) {
    // Add unique classes to the buttons for each section
    section.querySelectorAll('.s_button.next').forEach(button => {
        button.onclick = () => {
            let lists = section.querySelectorAll('.item');
            section.querySelector('.slide').appendChild(lists[0]);
        };
    });

    section.querySelectorAll('.s_button.prev').forEach(button => {
        button.onclick = () => {
            let lists = section.querySelectorAll('.item');
            section.querySelector('.slide').prepend(lists[lists.length - 1]);
        };
    });
}