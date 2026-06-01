import React from 'react';
import PixelChevron from './PixelChevron';
import styles from './StatTriangle.module.css';

interface StatTriangleProps {
  value: number | string;
  label: string;
  subLabel?: string;
}

const StatTriangle: React.FC<StatTriangleProps> = ({ value, label, subLabel }) => {
  // We can use a CSS variable for size if we want it to be fully reactive to CSS,
  // but for now, we'll let the CSS module handle the wrapping div sizes.
  // The PixelChevron uses the size prop for width, but we can override it in CSS.

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <PixelChevron size={60} />
      </div>
      <div className={styles.value}>
        {value}
      </div>
      <div className={styles.label}>
        {label}
      </div>
      {subLabel && (
        <div className={styles.subLabel}>{subLabel}</div>
      )}
    </div>
  );
};

export default StatTriangle;