/**
 * DashRx Website JavaScript
 * Handles form submission, validation, and smooth scroll navigation
 */

(function() {
  'use strict';

  // DOM elements
  let form, formStatus, submitButton, navToggle, navMenu;
  let formStartTime = Date.now();

  // Initialize when DOM is loaded
  document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeEventListeners();
    updateCopyrightYear();
    initializeMobileNav();
  });

  /**
   * Initialize DOM element references
   */
  function initializeElements() {
    form = document.getElementById('quote-form');
    formStatus = document.getElementById('form-status');
    submitButton = document.querySelector('.btn-submit');
    navToggle = document.querySelector('.nav-toggle');
    navMenu = document.querySelector('.nav-menu');
    
    // Update form start time for spam detection
    formStartTime = Date.now();
  }

  /**
   * Set up event listeners
   */
  function initializeEventListeners() {
    // Form submission
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
      
      // Real-time validation
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => validateField(input));
        input.addEventListener('input', () => clearFieldError(input));
      });
      
      // Character counter for message field
      const messageField = document.getElementById('message');
      if (messageField) {
        messageField.addEventListener('input', updateCharacterCount);
      }
    }

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', handleSmoothScroll);
    });

    // Mobile navigation toggle
    if (navToggle && navMenu) {
      navToggle.addEventListener('click', toggleMobileNav);
    }

    // Close mobile nav when clicking on links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', closeMobileNav);
    });

    // Close mobile nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        closeMobileNav();
      }
    });

  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Clear previous status
    hideFormStatus();
    
    // Validate form
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.length > 0 
        ? `Please fix these errors: ${validationResult.errors.join(', ')}`
        : 'Please correct the errors below.';
      showFormStatus(errorMessage, 'error');
      return;
    }
    
    // Check submission timing (spam prevention)
    const timeDiff = Date.now() - formStartTime;
    if (timeDiff < 2000) {
      showFormStatus('Please take your time filling out the form.', 'error');
      return;
    }
    
    // Show loading state
    setSubmitButtonLoading(true);
    
    try {
      // Collect form data
      const formData = collectFormData();
      
      // Submit to API
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          submission_time: formStartTime
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        // Success - redirect to success page or show inline message
        if (window.location.pathname === '/') {
          // Inline success message
          showFormStatus(
            '✅ Quote request submitted successfully! We\'ll email you shortly with a tailored delivery plan.',
            'success'
          );
          form.reset();
          formStartTime = Date.now(); // Reset timing
          
          // Scroll to success message
          formStatus.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // Optional: redirect to success page after delay
          setTimeout(() => {
            window.location.href = '/success';
          }, 3000);
        } else {
          window.location.href = '/success';
        }
      } else {
        // Handle API errors
        const errorMessage = result.error || 'Submission failed. Please try again.';
        showFormStatus(errorMessage, 'error');
        
        // Show contact info for persistent errors
        if (response.status >= 500) {
          showContactFallback();
        }
      }
      
    } catch (error) {
      console.error('Form submission error:', error);
      showFormStatus(
        'Network error. Please check your connection and try again.',
        'error'
      );
      showContactFallback();
    } finally {
      setSubmitButtonLoading(false);
    }
  }

  /**
   * Collect form data into object
   */
  function collectFormData() {
    const formData = new FormData(form);
    const data = {};
    
    // Convert FormData to plain object
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    
    return data;
  }

  /**
   * Validate entire form
   */
  function validateForm() {
    let isValid = true;
    const errors = [];
    
    // Required fields
    const requiredFields = [
      { id: 'pharmacy_name', name: 'Pharmacy name' },
      { id: 'contact_person', name: 'Contact person' },
      { id: 'phone', name: 'Phone number' },
      { id: 'email', name: 'Email address' }
    ];
    
    requiredFields.forEach(field => {
      const input = document.getElementById(field.id);
      const fieldResult = validateField(input);
      if (!fieldResult.isValid) {
        isValid = false;
        errors.push(`${field.name}: ${fieldResult.error}`);
      }
    });
    
    // Consent checkbox
    const consent = document.getElementById('consent');
    if (!consent.checked) {
      showFieldError(consent, 'You must confirm this form does not include patient information.');
      isValid = false;
      errors.push('Must confirm no patient information included');
    }
    
    // Honeypot check - more intelligent detection
    const honeypot = document.getElementById('company_website');
    if (honeypot && honeypot.value.trim() !== '') {
      const honeypotValue = honeypot.value.trim();
      
      // Log for debugging
      console.log('🍯 Honeypot field filled:', honeypotValue);
      
      // Allow common autofill values that browsers might insert (match server-side logic)
      const allowedAutofillValues = [
        'http://',
        'https://',
        'www.',
        'example.com',
        'test.com',
        'localhost',
        'projectjannahyemen'
      ];
      
      // Check if it's likely autofill vs. actual spam (same logic as server)
      const isLikelyAutofill = allowedAutofillValues.some(allowed => 
        honeypotValue.toLowerCase().includes(allowed.toLowerCase())
      ) || honeypotValue.length < 10; // Short values are likely accidental
      
      if (!isLikelyAutofill) {
        isValid = false;
        errors.push('Spam detection triggered');
        console.log('🚫 Honeypot triggered - likely spam:', honeypotValue);
      } else {
        console.log('✅ Honeypot filled but appears to be autofill, allowing submission');
        // Clear the honeypot value to prevent server-side rejection
        honeypot.value = '';
      }
    }
    
    return { isValid, errors };
  }

  /**
   * Validate individual field
   */
  function validateField(input) {
    if (!input) return { isValid: true, error: '' };
    
    const value = input.value.trim();
    const fieldId = input.id;
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
      errorMessage = 'This field is required';
      isValid = false;
    }
    
    // Specific field validation
    switch (fieldId) {
      case 'email':
        if (value && !isValidEmail(value)) {
          errorMessage = 'Invalid email format';
          isValid = false;
        }
        break;
        
      case 'phone':
        if (value && !isValidPhone(value)) {
          errorMessage = 'Invalid US phone number format';
          isValid = false;
        }
        break;
        
      case 'message':
        if (value.length > 2000) {
          errorMessage = 'Message too long (max 2000 characters)';
          isValid = false;
        }
        break;
    }
    
    // Show/hide error
    if (isValid) {
      clearFieldError(input);
    } else {
      showFieldError(input, errorMessage);
    }
    
    return { isValid, error: errorMessage };
  }

  /**
   * Email validation
   */
  function isValidEmail(email) {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Phone validation (US format)
   */
  function isValidPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    return (digits.length === 10 && /^[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits)) ||
           (digits.length === 11 && digits.startsWith('1') && /^1[2-9]\d{2}[2-9]\d{2}\d{4}$/.test(digits));
  }

  /**
   * Show field error
   */
  function showFieldError(input, message) {
    const errorElement = document.getElementById(input.id + '_error');
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
    }
    input.classList.add('error');
    input.setAttribute('aria-invalid', 'true');
  }

  /**
   * Clear field error
   */
  function clearFieldError(input) {
    const errorElement = document.getElementById(input.id + '_error');
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
    }
    input.classList.remove('error');
    input.removeAttribute('aria-invalid');
  }

  /**
   * Show form status message
   */
  function showFormStatus(message, type) {
    if (!formStatus) return;
    
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    formStatus.style.display = 'block';
    
    // Announce to screen readers
    formStatus.setAttribute('aria-live', 'polite');
    if (type === 'error') {
      formStatus.setAttribute('role', 'alert');
    }
  }

  /**
   * Hide form status
   */
  function hideFormStatus() {
    if (formStatus) {
      formStatus.style.display = 'none';
      formStatus.removeAttribute('aria-live');
      formStatus.removeAttribute('role');
    }
  }

  /**
   * Set submit button loading state
   */
  function setSubmitButtonLoading(loading) {
    if (!submitButton) return;
    
    const btnText = submitButton.querySelector('.btn-text');
    const btnLoading = submitButton.querySelector('.btn-loading');
    
    if (loading) {
      submitButton.disabled = true;
      if (btnText) btnText.hidden = true;
      if (btnLoading) btnLoading.hidden = false;
    } else {
      submitButton.disabled = false;
      if (btnText) btnText.hidden = false;
      if (btnLoading) btnLoading.hidden = true;
    }
  }

  /**
   * Show contact fallback info
   */
  function showContactFallback() {
    const fallbackHTML = `
      <div style="margin-top: 1rem; padding: 1rem; background-color: #F3F4F6; border-radius: 0.5rem;">
        <p><strong>Having trouble?</strong> Contact us directly:</p>
        <p>📞 <a href="tel:+13133332133">(313) 333-2133</a></p>
        <p>📧 <a href="mailto:dashrx10@gmail.com">dashrx10@gmail.com</a></p>
      </div>
    `;
    
    if (formStatus) {
      formStatus.innerHTML += fallbackHTML;
    }
  }

  /**
   * Update character count for message field
   */
  function updateCharacterCount() {
    const messageField = document.getElementById('message');
    const helpText = document.getElementById('message_help');
    
    if (messageField && helpText) {
      const currentLength = messageField.value.length;
      const maxLength = 2000;
      const remaining = maxLength - currentLength;
      
      helpText.textContent = `${remaining} characters remaining (${currentLength}/${maxLength})`;
      
      if (remaining < 100) {
        helpText.style.color = '#F59E0B'; // Warning color
      } else {
        helpText.style.color = ''; // Reset to default
      }
    }
  }

  /**
   * Handle smooth scroll for anchor links
   */
  function handleSmoothScroll(e) {
    const href = e.currentTarget.getAttribute('href');
    
    if (href.startsWith('#')) {
      e.preventDefault();
      
      const targetId = href.substring(1);
      const target = document.getElementById(targetId);
      
      if (target) {
        const headerHeight = document.querySelector('.header').offsetHeight;
        const targetPosition = target.offsetTop - headerHeight - 20; // 20px extra padding
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        if (history.pushState) {
          history.pushState(null, null, href);
        }
        
        // Close mobile nav if open
        closeMobileNav();
      }
    }
  }

  /**
   * Initialize mobile navigation
   */
  function initializeMobileNav() {
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', 'false');
      navToggle.setAttribute('aria-controls', 'navigation-menu');
    }
    
    if (navMenu) {
      navMenu.setAttribute('id', 'navigation-menu');
    }
  }

  /**
   * Toggle mobile navigation
   */
  function toggleMobileNav() {
    if (!navToggle || !navMenu) return;
    
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    
    navToggle.setAttribute('aria-expanded', !isExpanded);
    navMenu.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    document.body.style.overflow = !isExpanded ? 'hidden' : '';
  }

  /**
   * Close mobile navigation
   */
  function closeMobileNav() {
    if (!navToggle || !navMenu) return;
    
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * Update copyright year
   */
  function updateCopyrightYear() {
    const yearElements = document.querySelectorAll('#current-year');
    const currentYear = new Date().getFullYear();
    
    yearElements.forEach(element => {
      element.textContent = currentYear;
    });
  }

  /**
   * Keyboard navigation enhancement
   */
  document.addEventListener('keydown', function(e) {
    // Escape key closes mobile nav
    if (e.key === 'Escape') {
      closeMobileNav();
    }
    
    // Enter key on nav toggle activates it
    if (e.key === 'Enter' && e.target === navToggle) {
      e.preventDefault();
      toggleMobileNav();
    }
  });

  /**
   * Focus management for accessibility
   */
  document.addEventListener('focusin', function(e) {
    // Ensure form errors are announced when fields receive focus
    const input = e.target;
    if (input.hasAttribute('aria-invalid') && input.getAttribute('aria-invalid') === 'true') {
      const errorElement = document.getElementById(input.id + '_error');
      if (errorElement && errorElement.textContent) {
        // Error will be announced due to aria-describedby relationship
      }
    }
  });


  /**
   * Client-side error logging
   */
  function logClientError(error, context = '') {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context: context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.error('Client Error:', errorData);
    
    // Optionally send to server (uncomment if needed)
    // fetch('/api/logs/client-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData)
    // }).catch(() => {}); // Ignore failures
  }

  /**
   * Global error handler
   */
  window.addEventListener('error', function(e) {
    logClientError(e.error || new Error(e.message), 'Global error handler');
  });

  window.addEventListener('unhandledrejection', function(e) {
    logClientError(new Error(e.reason), 'Unhandled promise rejection');
  });

  /**
   * Intersection Observer for animations (if needed)
   */
  if ('IntersectionObserver' in window) {
    const observerCallback = function(entries) {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    };
    
    const observer = new IntersectionObserver(observerCallback, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe elements that should animate in
    document.querySelectorAll('.feature-card, .benefit-item').forEach(el => {
      observer.observe(el);
    });
  }

})();
