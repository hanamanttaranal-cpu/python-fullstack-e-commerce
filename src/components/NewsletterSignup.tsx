import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useToast } from './Toast';

export default function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { showToast } = useToast();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      showToast('Please enter a valid email address.', 'warning');
      return;
    }

    // Simple email validation regex to match what the Firestore rules expect (.+@.+\..+)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      showToast('Please enter a valid email address with an @ and a domain.', 'warning');
      return;
    }

    setLoading(true);

    try {
      const colRef = collection(db, 'newsletters');
      await addDoc(colRef, {
        email: trimmedEmail,
        createdAt: serverTimestamp(),
      });

      setSubscribed(true);
      setEmail('');
      showToast('Thank you! You have successfully subscribed to our newsletter.', 'success');
    } catch (error) {
      console.error('Newsletter subscription failed:', error);
      showToast('Unable to complete subscription. Please try again.', 'error');
      // Strictly report the firestore error details as mandated by the Firebase Skill
      try {
        handleFirestoreError(error, OperationType.WRITE, 'newsletters');
      } catch (innerErr) {
        // Log or throw as desired
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section 
      className="relative overflow-hidden bg-gray-900 text-white py-16 sm:py-20 px-4 sm:px-6 lg:px-8 mt-16 rounded-3xl max-w-7xl mx-auto border border-gray-800" 
      id="newsletter-signup-section"
    >
      {/* Decorative background grid elements */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-indigo-500 opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500 opacity-15 blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center" id="newsletter-content-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center justify-center space-y-4"
        >
          {/* Subtle Sparkle Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide text-indigo-300 border border-white/5 font-sans">
            <Sparkles className="h-3 w-3" />
            <span>Stay in the Loop</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
            Subscribe to our Newsletter
          </h2>
          <p className="max-w-xl text-sm sm:text-base text-gray-400 font-sans leading-relaxed">
            Get premium insights, dynamic design trends, new arrivals, and members-only offers delivered straight to your inbox. No spam, ever.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-10 max-w-md mx-auto"
        >
          {subscribed ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs"
              id="newsletter-success-box"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3 animate-bounce" />
              <h3 className="text-base font-bold text-white font-sans">You're on the list!</h3>
              <p className="text-xs text-gray-400 mt-1 text-center font-sans">
                Thank you for subscribing. We will send you exclusive updates soon.
              </p>
              <button 
                onClick={() => setSubscribed(false)} 
                className="mt-4 text-xs font-semibold text-indigo-300 hover:text-indigo-200 underline transition-all"
              >
                Sign up another email
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} className="relative flex flex-col sm:flex-row gap-3" id="newsletter-form">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="newsletter-email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  disabled={loading}
                  className="block w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 disabled:opacity-50"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                id="newsletter-subscribe-button"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-2xl text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-950 transition-colors duration-250 cursor-pointer disabled:opacity-50 gap-2 shrink-0"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Subscribe</span>
                    <Send className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
