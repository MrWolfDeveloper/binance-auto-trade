function OpenTab(Event, TabName) {
	var i, TabContent, TabLinks;

	TabContent = document.getElementsByClassName('tabcontent');

	for (i = 0; i < TabContent.length; i++) {
		TabContent[i].style.display = 'none';
	}

	TabLinks = document.getElementsByClassName('tablinks');
	for (i = 0; i < TabLinks.length; i++) {
		TabLinks[i].className = TabLinks[i].className.replace(' active', '');
	}

	document.getElementById(TabName).style.display = 'block';
	Event.currentTarget.className += ' active';

	// Get api data
	GetData(TabName);
}
