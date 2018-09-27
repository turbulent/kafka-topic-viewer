export {}; // dummy export needed to make global declarations

declare global {
  namespace JSX {
    interface IntrinsicElements {
      listbar: any;
      listtable: any;
      list: any;
    }
  }
}
