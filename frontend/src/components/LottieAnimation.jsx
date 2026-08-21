import React from 'react';
import { LottieLight } from 'lottie-react';
import { 
  successTickLottie, 
  deleteTrashLottie, 
  loadingSpinnerLottie, 
  emailSentLottie 
} from '../assets/lottie/animations';

export const ANIMATION_MAP = {
  success: successTickLottie,
  tick: successTickLottie,
  approved: successTickLottie,
  delete: deleteTrashLottie,
  trash: deleteTrashLottie,
  loading: loadingSpinnerLottie,
  spinner: loadingSpinnerLottie,
  email: emailSentLottie,
  mail: emailSentLottie
};

export default function LottieAnimation({ 
  type = 'success', 
  src,
  animationData, 
  loop = true, 
  autoplay = true, 
  size = 50, 
  width, 
  height, 
  style = {} 
}) {
  const selectedData = src || animationData || ANIMATION_MAP[type] || successTickLottie;
  const finalWidth = width || size;
  const finalHeight = height || size;

  return (
    <div
      style={{
        width: `${finalWidth}px`,
        height: `${finalHeight}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style
      }}
    >
      <LottieLight
        src={selectedData}
        loop={loop}
        autoplay={autoplay}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
    </div>
  );
}
