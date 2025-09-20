/**
 * DashRx Website JavaScript
 * Handles form submission, validation, and smooth scroll navigation
 */

(function() {
  'use strict';

  // DOM elements
  let form, formAlert, submitButton, navToggle, navMenu;
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
    form = document.getElementById('quoteForm');
    formAlert = document.getElementById('formAlert');
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
    }

    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      });
    });

    // Mobile navigation toggle
    if (navToggle) {
      navToggle.addEventListener('click', toggleMobileNav);
    }

    // Close mobile nav when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.nav') && navMenu && navMenu.classList.contains('show')) {
        closeMobileNav();
      }
    });

    // Global error handling
    window.addEventListener('error', function(e) {
      logClientError(e.error, 'Global error');
    });

    window.addEventListener('unhandledrejection', function(e) {
      logClientError(e.reason, 'Unhandled promise rejection');
    });
  }

  /**
   * Handle form submission
   */
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Clear any previous alerts
    hideFormAlert();
    
    // Client-side validation
    const validationResult = validateForm();
    if (!validationResult.isValid) {
      showFormAlert('error', validationResult.errors.join(', '));
      return;
    }
    
    // Set loading state
    setSubmitButtonLoading(true);
    
    try {
      // Build payload
      const formData = new FormData(form);
      const payload = {
        pharmacy_name: formData.get('pharmacy_name') || '',
        contact_person: formData.get('contact_person') || '',
        email: formData.get('email') || '',
        phone: formData.get('phone') || '',
        address: formData.get('address') || '',
        monthly_scripts: formData.get('monthly_scripts') || '', // Server expects this field name
        message: formData.get('message') || '',
        company_website: formData.get('company_website') || '',
        consent: formData.has('consent'),
        submission_time: formStartTime // Time when page loaded, not when submitted
      };

      console.log('Submitting payload:', payload);

      // Submit to server
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success - redirect to success page
        window.location.href = '/success';
      } else {
        // Handle validation or server errors
        let errorMessage = 'There was an error submitting your request. Please try again.';
        
        if (data.details && Array.isArray(data.details)) {
          errorMessage = data.details.join(', ');
        } else if (data.error) {
          errorMessage = data.error;
        }
        
        showFormAlert('error', errorMessage);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      showFormAlert('error', 'Network error. Please check your connection and try again.');
      logClientError(error, 'Form submission');
    } finally {
      setSubmitButtonLoading(false);
    }
  }

  /**
   * Validate entire form
   */
  function validateForm() {
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
      if (!input || !input.value.trim()) {
        errors.push(`${field.name} is required`);
      }
    });
    
    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput && emailInput.value && !isValidEmail(emailInput.value)) {
      errors.push('Please enter a valid email address');
    }
    
    // Phone validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput && phoneInput.value && !isValidPhone(phoneInput.value)) {
      errors.push('Please enter a valid US phone number');
    }
    
    // Consent checkbox
    const consentInput = document.getElementById('consent');
    if (!consentInput || !consentInput.checked) {
      errors.push('You must confirm this form does not include patient information');
    }
    
    // Honeypot check
    const honeypotInput = document.getElementById('company_website');
    if (honeypotInput && honeypotInput.value.trim() !== '') {
      // Log for debugging but treat as spam
      console.log('🍯 Honeypot filled:', honeypotInput.value);
      
      // Allow common autofill values
      const allowedAutofillValues = [
        'http://', 'https://', 'www.', 'example.com', 'test.com', 'localhost', 'projectjannahyemen'
      ];
      
      const isLikelyAutofill = allowedAutofillValues.some(allowed => 
        honeypotInput.value.toLowerCase().includes(allowed.toLowerCase())
      ) || honeypotInput.value.length < 10;
      
      if (!isLikelyAutofill) {
        errors.push('Spam detection triggered');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Validate individual field
   */
  function validateField(input) {
    if (!input) return true;
    
    const value = input.value.trim();
    const fieldId = input.id;
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
      errorMessage = 'This field is required.';
      isValid = false;
    }
    
    // Specific field validation
    switch (fieldId) {
      case 'email':
        if (value && !isValidEmail(value)) {
          errorMessage = 'Please enter a valid email address.';
          isValid = false;
        }
        break;
        
      case 'phone':
        if (value && !isValidPhone(value)) {
          errorMessage = 'Please enter a valid US phone number.';
          isValid = false;
        }
        break;
        
      case 'message':
        if (value.length > 2000) {
          errorMessage = 'Message must be 2000 characters or less.';
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
    
    return isValid;
  }

  /**
   * Email validation
   */
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * US phone validation
   */
  function isValidPhone(phone) {
    const phoneRegex = /^[\(\)\s\-\.\+]*[0-9][\(\)\s\-\.\+0-9]*$/;
    const digits = phone.replace(/\D/g, '');
    return phoneRegex.test(phone) && digits.length >= 10 && digits.length <= 11;
  }

  /**
   * Show field error
   */
  function showFieldError(input, message) {
    const errorId = input.id + '_error';
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
      errorElement = input.parentNode.querySelector('.form-error');
    }
    
    if (errorElement) {
      errorElement.textContent = message;
      errorElement.classList.add('show');
      input.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Clear field error
   */
  function clearFieldError(input) {
    const errorId = input.id + '_error';
    let errorElement = document.getElementById(errorId);
    
    if (!errorElement) {
      errorElement = input.parentNode.querySelector('.form-error');
    }
    
    if (errorElement) {
      errorElement.textContent = '';
      errorElement.classList.remove('show');
      input.removeAttribute('aria-invalid');
    }
  }

  /**
   * Show form alert
   */
  function showFormAlert(type, message) {
    if (!formAlert) return;
    
    formAlert.textContent = message;
    formAlert.className = `form-alert ${type}`;
    formAlert.style.display = 'block';
    
    // Scroll to alert
    formAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Hide form alert
   */
  function hideFormAlert() {
    if (!formAlert) return;
    
    formAlert.style.display = 'none';
    formAlert.className = 'form-alert';
    formAlert.textContent = '';
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
   * Mobile navigation functions
   */
  function initializeMobileNav() {
    // Mobile nav is handled by CSS, just ensure toggle works
  }

  function toggleMobileNav() {
    if (!navMenu) return;
    
    if (navMenu.classList.contains('show')) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  function openMobileNav() {
    if (!navMenu || !navToggle) return;
    
    navMenu.classList.add('show');
    navToggle.setAttribute('aria-expanded', 'true');
  }

  function closeMobileNav() {
    if (!navMenu || !navToggle) return;
    
    navMenu.classList.remove('show');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  /**
   * Update copyright year
   */
  function updateCopyrightYear() {
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('.copyright-year');
    copyrightElements.forEach(element => {
      element.textContent = currentYear;
    });
  }

  /**
   * Log client-side errors
   */
  function logClientError(error, context) {
    console.error(`Client Error [${context}]:`, error);
    
    // You could send these to your server for monitoring
    // fetch('/api/client-errors', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     error: error.toString(),
    //     stack: error.stack,
    //     context: context,
    //     url: window.location.href,
    //     userAgent: navigator.userAgent,
    //     timestamp: new Date().toISOString()
    //   })
    // }).catch(() => {}); // Silent fail
  }
})();