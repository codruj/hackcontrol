import type { ComponentProps, FC } from "react";

const Trophy: FC<ComponentProps<"svg">> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    strokeWidth="1.5"
    color="currentColor"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.745 4h10.51s-.88 13.257-5.255 13.257S6.745 4 6.745 4z"
    ></path>
    <path
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.745 4H2v3c0 1.105.895 2 2 2h2.745M17.255 4H22v3c0 1.105-.895 2-2 2h-2.745M12 17.257V20.4M12 20.4h4.571M12 20.4H7.429"
    ></path>
  </svg>
);

export default Trophy;
