window.addEventListener('scroll', function() {
  var scrollY = window.scrollY;
  var siteInfo = document.getElementById('site-info');
  if (siteInfo && scrollY < window.innerHeight) {
    siteInfo.style.transform = 'translateY(' + (scrollY * 0.5) + 'px)';
    siteInfo.style.opacity = 1 - (scrollY / window.innerHeight);
  }
});
