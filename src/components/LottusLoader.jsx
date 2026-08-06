import React from 'react';
import './LottusLoader.css';

const LottusLoader = () => {
  return (
    <div className="lottus-loader-overlay">
      <h1 className="lottus-loader-text" data-text="LOTTUS">
        LOTTUS
      </h1>
      <div className="lottus-loader-bar" />
    </div>
  );
};

export default LottusLoader;
