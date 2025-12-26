import {
  Table as ExpoTable,
  TBody as ExpoTBody,
  Caption as ExpoTCaption,
  TFoot as ExpoTFoot,
  THead as ExpoTHead,
  TR as ExpoTR,
} from "@expo/html-elements";
import React, { createContext, useContext, useMemo } from "react";

import { Text, TextProps, View, ViewProps } from "react-native";
import {
  tableBodyStyle,
  tableCaptionStyle,
  tableDataStyle,
  tableFooterStyle,
  tableHeaderStyle,
  tableHeadStyle,
  tableRowStyleStyle,
  tableStyle,
} from "./styles";

const TableHeaderContext = createContext<{
  isHeaderRow: boolean;
}>({
  isHeaderRow: false,
});
const TableFooterContext = createContext<{
  isFooterRow: boolean;
}>({
  isFooterRow: false,
});

type ITableProps = React.ComponentProps<typeof ExpoTable>;
type ITableHeaderProps = React.ComponentProps<typeof ExpoTHead>;
type ITableBodyProps = React.ComponentProps<typeof ExpoTBody>;
type ITableFooterProps = React.ComponentProps<typeof ExpoTFoot>;
type NativeTableHeadViewProps = ViewProps & {
  className?: string;
  useRNView: true;
};
type NativeTableHeadTextProps = TextProps & {
  className?: string;
  useRNView?: false;
};
type ITableHeadProps = NativeTableHeadViewProps | NativeTableHeadTextProps;
type ITableRowProps = React.ComponentProps<typeof ExpoTR>;
type NativeTableDataViewProps = ViewProps & {
  className?: string;
  useRNView: true;
};
type NativeTableDataTextProps = TextProps & {
  className?: string;
  useRNView?: false;
};
type ITableDataProps = NativeTableDataViewProps | NativeTableDataTextProps;
type ITableCaptionProps = React.ComponentProps<typeof ExpoTCaption>;

const Table = React.forwardRef<
  React.ComponentRef<typeof ExpoTable>,
  ITableProps
>(({ className, ...props }, ref) => {
  return (
    <ExpoTable
      ref={ref}
      className={tableStyle({ class: className })}
      {...props}
    />
  );
});

const TableHeader = React.forwardRef<
  React.ComponentRef<typeof ExpoTHead>,
  ITableHeaderProps
>(function TableHeader({ className, ...props }, ref) {
  const contextValue = useMemo(() => {
    return {
      isHeaderRow: true,
    };
  }, []);
  return (
    <TableHeaderContext.Provider value={contextValue}>
      <ExpoTHead
        ref={ref}
        className={tableHeaderStyle({ class: className })}
        {...props}
      />
    </TableHeaderContext.Provider>
  );
});

const TableBody = React.forwardRef<
  React.ComponentRef<typeof ExpoTBody>,
  ITableBodyProps
>(function TableBody({ className, ...props }, ref) {
  return (
    <ExpoTBody
      ref={ref}
      className={tableBodyStyle({ class: className })}
      {...props}
    />
  );
});

const TableFooter = React.forwardRef<
  React.ComponentRef<typeof ExpoTFoot>,
  ITableFooterProps
>(function TableFooter({ className, ...props }, ref) {
  const contextValue = useMemo(() => {
    return {
      isFooterRow: true,
    };
  }, []);
  return (
    <TableFooterContext.Provider value={contextValue}>
      <ExpoTFoot
        ref={ref}
        className={tableFooterStyle({ class: className })}
        {...props}
      />
    </TableFooterContext.Provider>
  );
});

function isViewHeadProps(props: ITableHeadProps): props is NativeTableHeadViewProps {
  return props.useRNView === true;
}

const TableHead = React.forwardRef<View | Text, ITableHeadProps>(function TableHead(
  props,
  ref,
) {
  if (isViewHeadProps(props)) {
    const { className, ...rest } = props;
    return (
      <View
        ref={ref as React.ForwardedRef<View>}
        className={tableHeadStyle({ class: className })}
        {...rest}
      />
    );
  }

  const { className, ...rest } = props;
  return (
    <Text
      ref={ref as React.ForwardedRef<Text>}
      className={tableHeadStyle({ class: className })}
      {...rest}
    />
  );
});

const TableRow = React.forwardRef<
  React.ComponentRef<typeof ExpoTR>,
  ITableRowProps
>(function TableRow({ className, ...props }, ref) {
  const { isHeaderRow } = useContext(TableHeaderContext);
  const { isFooterRow } = useContext(TableFooterContext);

  return (
    <ExpoTR
      ref={ref}
      className={tableRowStyleStyle({
        isHeaderRow,
        isFooterRow,
        class: className,
      })}
      {...props}
    />
  );
});

function isViewDataProps(props: ITableDataProps): props is NativeTableDataViewProps {
  return props.useRNView === true;
}

const TableData = React.forwardRef<View | Text, ITableDataProps>(function TableData(
  props,
  ref,
) {
  if (isViewDataProps(props)) {
    const { className, ...rest } = props;
    return (
      <View
        ref={ref as React.ForwardedRef<View>}
        className={tableDataStyle({ class: className })}
        {...rest}
      />
    );
  }

  const { className, ...rest } = props;
  return (
    <Text
      ref={ref as React.ForwardedRef<Text>}
      className={tableDataStyle({ class: className })}
      {...rest}
    />
  );
});

const TableCaption = React.forwardRef<
  React.ComponentRef<typeof ExpoTCaption>,
  ITableCaptionProps
>(({ className, ...props }, ref) => {
  return (
    <ExpoTCaption
      ref={ref}
      className={tableCaptionStyle({ class: className })}
      {...props}
    />
  );
});

Table.displayName = "Table";
TableHeader.displayName = "TableHeader";
TableBody.displayName = "TableBody";
TableFooter.displayName = "TableFooter";
TableHead.displayName = "TableHead";
TableRow.displayName = "TableRow";
TableData.displayName = "TableData";
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableBody,
  TableCaption,
  TableData,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
};
