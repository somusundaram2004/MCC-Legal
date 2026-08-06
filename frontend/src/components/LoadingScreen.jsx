import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingScreen = ({ loading = true, message = "Loading module..." }) => {
  // Prevent scrolling when loading overlay is active
  useEffect(() => {
    if (loading) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [loading]);

  const easeCurve = [0.4, 0.0, 0.2, 1.0];

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: easeCurve }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            pointerEvents: 'auto',
          }}
        >
          {/* Centered Medium Loader Card */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05, duration: 0.4, ease: easeCurve }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '32px 40px',
              borderRadius: '24px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 50px rgba(79, 70, 229, 0.12)',
              border: '1px solid rgba(226, 232, 240, 0.8)',
              maxWidth: '320px',
              width: '85%',
              margin: 'auto',
            }}
          >
            {/* Medium size video animation container */}
            <div
              style={{
                width: '100px',
                height: '100px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                borderRadius: '20px',
                overflow: 'hidden',
              }}
            >
              <video
                src="/loading_image.mp4"
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  maxHeight: '100px',
                  maxWidth: '100px',
                }}
              />
            </div>

            {/* Centered Loading Message */}
            {message && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p
                  style={{
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    margin: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {message}
                </p>

                {/* Animated progress bar indicator */}
                <div
                  style={{
                    width: '120px',
                    height: '3px',
                    backgroundColor: '#F1F5F9',
                    borderRadius: '999px',
                    marginTop: '14px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <motion.div
                    animate={{
                      x: [-120, 120]
                    }}
                    transition={{
                      duration: 1.4,
                      ease: "easeInOut",
                      repeat: Infinity
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                      borderRadius: '999px',
                    }}
                  />
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingScreen;
