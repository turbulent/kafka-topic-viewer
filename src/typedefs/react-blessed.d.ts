export {}; // dummy export needed to make global declarations

declare global {
  namespace JSX {
    interface IntrinsicElements {
      element: any;
      listbar: any;
      listtable: any;
      list: any;
      textbox: any;
    }
  }
}
