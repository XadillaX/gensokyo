/**
 * each router example:
 *
 *   + single controller
 *     - foo : "bar"
 *     - foo : [ "bar" ]
 *     - foo : { ctrller: "bar" }
 *
 *   + multi controller
 *     - foo : [ [ "bar1", "bar2" ] ]
 *     - foo : { ctrller: [ "bar1", "bar2" ] }
 *
 *   + with single/multiple `before filter`
 *     - foo : [ "before", "bar" ]                      ///< with only 2 elements in the array
 *     - foo : [ "before", [ "bar1", "bar2" ] ]         ///< with only 2 elements in the array
 *     - foo : [ [ "before1", "before2" ], [ "bar" ] ]  ///< with only 2 elements in the array
 *     - foo : { before: "before", ctrller: "bar" }
 *     - foo : { before: [ "before1", "before2" ], ctrller: "bar" }
 *
 *   + with single/multiple `after filter`
 *     - foo : { ctrller: ..., after: [ ... ] }
 *     - foo : { ctrller: ..., after: "bar" }
 *
 *   + with both `before` and `after` filters
 *     - foo : [ "before", "bar", "after" ]             ///< must with 3 elements in the array
 *     - foo : [ [ ... ], [ ... ], [ ... ] ]            ///< must with 3 elements in the array
 *     - foo : { before: "before" / [ ... ], ctrller: "bar" / [ ... ], after: "after" / [ ... ]}
 */
module.exports = {
    echo1           : [ "before1", "echo2" ],
    echo2           : [ "before1", [ "echo1", "echo2" ], "after1" ],
    echo3           : "echo1",
    echo4           : { before: [ "before1" ], ctrller: "echo1" }
};
