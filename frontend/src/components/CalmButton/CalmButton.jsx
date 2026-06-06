import { forwardRef, useMemo } from 'react';
import styles from './CalmButton.module.css';

/**
 * CalmButton — AuraOS "Ethereal Nature" polymorphic component.
 * 
 * Scalable, sensory-friendly button refactored from "Cosmic Galaxy" 
 * to a calming bioluminescent forest theme.
 */
const CalmButton = forwardRef(({ 
  as: Component = 'button', 
  children, 
  className = '', 
  ...props 
}, ref) => {
  
  // Generating 20 fireflies for the ring with non-aggressive timing
  const fireflies = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      style: {
        '--angle': Math.floor(Math.random() * 360),
        '--duration': Math.floor(Math.random() * (60 - 18) + 18), // 3x slower (18-60s)
        '--delay': Math.floor(Math.random() * 30),
        '--alpha': (Math.random() * (0.8 - 0.3) + 0.3).toFixed(2),
        '--size': Math.floor(Math.random() * (5 - 2) + 2),
        '--distance': Math.floor(Math.random() * (150 - 40) + 40),
      }
    }));
  }, []);

  // Generating 4 static ambient fireflies
  const staticFireflies = useMemo(() => {
    return Array.from({ length: 4 }).map((_, i) => ({
      id: i,
      style: {
        '--duration': Math.floor(Math.random() * (80 - 40) + 40),
        '--delay': Math.floor(Math.random() * 20),
        '--size': Math.floor(Math.random() * (4 - 2) + 2),
      }
    }));
  }, []);

  return (
    /* Wrapper div allows external Tailwind classes to control layout/sizing */
    <div className={`relative inline-block transition-transform duration-300 ${className}`}>
      <Component
        ref={ref}
        className={styles.button}
        {...props}
      >
        {/* Animated border sweep */}
        <span className={styles.spark} aria-hidden="true" />
        
        {/* Inner frosted glass backdrop */}
        <span className={styles.backdrop} aria-hidden="true" />
        
        {/* Static ambient fireflies */}
        <span className={styles.fireflyContainer} aria-hidden="true">
          {staticFireflies.map((f) => (
            <span 
              key={`static-${f.id}`} 
              className={`${styles.firefly} ${styles.fireflyStatic}`} 
              style={f.style} 
            />
          ))}
        </span>

        {/* Drifting firefly ring */}
        <span className={styles.galaxy} aria-hidden="true">
          <span className={styles.galaxyRing}>
            {fireflies.map((f) => (
              <span 
                key={`firefly-${f.id}`} 
                className={styles.firefly} 
                style={f.style} 
              />
            ))}
          </span>
        </span>

        {/* Button label */}
        <span className={styles.text}>{children}</span>
      </Component>
    </div>
  );
});

CalmButton.displayName = 'CalmButton';

export default CalmButton;
