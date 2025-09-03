document.addEventListener('DOMContentLoaded', () => {
  const messageBlock = document.getElementById('early-access-message-block');
  if (!messageBlock) {
    console.log('Early Access: Message block not found.');
    return;
  }

  const settings = JSON.parse(messageBlock.dataset.blockSettings || '{}');
  const params = new URLSearchParams(window.location.search);
  const isLoggedIn = params.get('logged_in') === 'true';

  const lang = document.documentElement.lang.split('-')[0] || 'en';

  const titleEl = document.getElementById('early-access-title');
  const descriptionEl = document.getElementById('early-access-description');
  const backButton = document.getElementById('early-access-back-button');
  const loginLink = document.getElementById('early-access-login-link');

  const requiredPoints = params.get('need') || '0';
  const hasPoints = params.get('have') || '0';
  const missingPoints = Math.max(0, parseInt(requiredPoints, 10) - parseInt(hasPoints, 10));
  const requiredTag = params.get('tag') || '';
  const mode = params.get('mode');
  const origin = params.get('origin');

  let title = '';
  let description = '';

  if (lang === 'de') {
    title = settings.title_de || 'Zugriff beschränkt';
    switch (mode) {
      case 'points':
        description = settings.description_points_de || 'Sie benötigen [need] Punkte, um auf diesen Inhalt zuzugreifen. Sie haben derzeit [have] Punkte. Ihnen fehlen [missing] Punkte.';
        break;
      case 'tag':
        description = settings.description_tag_de || "Sie benötigen den Tag '[tag]', um auf diesen Inhalt zuzugreifen.";
        break;
      case 'points_or_tag':
        description = settings.description_points_or_tag_de || "Sie benötigen [need] Punkte oder den Tag '[tag]', um auf diesen Inhalt zuzugreifen. Sie haben derzeit [have] Punkte. Ihnen fehlen [missing] Punkte.";
        break;
    }
  } else {
    title = settings.title_en || 'Access Restricted';
    switch (mode) {
      case 'points':
        description = settings.description_points_en || 'You need [need] points to access this content. You currently have [have] points. You are missing [missing] points.';
        break;
      case 'tag':
        description = settings.description_tag_en || "You need the tag '[tag]' to access this content.";
        break;
      case 'points_or_tag':
        description = settings.description_points_or_tag_en || "You need [need] points or the tag '[tag]' to access this content. You currently have [have] points. You are missing [missing] points.";
        break;
    }
  }
  
    if (titleEl) {
    titleEl.textContent = title;
  }

  if (descriptionEl) {
    description = description
      .replace('[need]', requiredPoints)
      .replace('[have]', hasPoints)
      .replace('[missing]', missingPoints.toString())
      .replace('[tag]', requiredTag);
    descriptionEl.innerHTML = description;
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      if (document.referrer && new URL(document.referrer).hostname === window.location.hostname) {
        history.back();
      } else if (origin) {
        window.location.href = origin;
      } else {
        window.location.href = '/';
      }
    });
  }
  
  if (loginLink) {
    if (isLoggedIn) {
      loginLink.style.display = 'none';
    } else {
      loginLink.style.display = 'inline-flex';
      if (origin) {
                loginLink.href = `/customer_authentication/login?return_to=${origin}`; 
    }
  }
}
});
