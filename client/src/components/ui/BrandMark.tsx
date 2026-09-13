const BrandMark = ({ className = '' }) => {
  return (
    <img
      src="/Logo.png"
      alt="StaffPilot"
      className={`${className} object-contain`}
      draggable="false"
    />
  );
};

export default BrandMark;
